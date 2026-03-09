from __future__ import annotations

from types import ModuleType
from typing import Optional, Protocol, cast

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel


class AdminPagePerfEventPayload(Protocol):
    pageId: str
    scenario: str
    durationMs: float
    source: str | None


class AdminOAuthSettingsPayload(Protocol):
    google_oauth_enabled: bool
    google_redirect_uri: str | None
    google_frontend_redirect_uri: str | None


class AdminUserRolePayload(Protocol):
    role: str
    reason: str | None


class AdminProjectUpdatePayload(Protocol):
    def model_dump(self, *, exclude_none: bool = False) -> dict[str, object]: ...


class AdminActionReasonPayload(Protocol):
    reason: str | None


class AdminUserLimitPayload(Protocol):
    hours: int
    reason: str | None


class AdminUserDeleteSchedulePayload(Protocol):
    days: int
    reason: str | None


class AdminReportUpdatePayload(Protocol):
    status: str
    reason: str | None


def register_admin_operations_routes(
    app: FastAPI,
    main_module: ModuleType,
    admin_page_perf_event_request_model: type[BaseModel],
    admin_oauth_settings_update_request_model: type[BaseModel],
    admin_user_role_update_request_model: type[BaseModel],
    admin_project_update_request_model: type[BaseModel],
    admin_action_reason_request_model: type[BaseModel],
    admin_user_limit_request_model: type[BaseModel],
    admin_user_delete_schedule_request_model: type[BaseModel],
    admin_report_update_request_model: type[BaseModel],
) -> None:
    @app.get("/api/admin/reports")
    def list_reports(
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        current_user: object = Depends(main_module.require_admin),
    ):
        _ = current_user
        reports = main_module.get_reports(status=status, limit=limit, offset=offset)
        total = main_module.get_reports_count(status=status)
        for report in reports:
            report["id"] = str(report["id"])
            if report.get("reporter_id"):
                report["reporter_id"] = str(report["reporter_id"])
        return {"items": reports, "total": total, "next_cursor": None}

    @app.get("/api/admin/perf/projects")
    def get_projects_perf(current_user: object = Depends(main_module.require_admin)):
        _ = current_user
        return main_module._project_perf_snapshot()

    @app.get("/api/admin/perf/page-editor")
    def get_page_editor_perf(current_user: object = Depends(main_module.require_admin)):
        _ = current_user
        return main_module._page_editor_perf_snapshot()

    @app.post("/api/admin/perf/page-editor/events")
    def create_page_editor_perf_event(
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminPagePerfEventPayload,
            admin_page_perf_event_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        duration_ms = max(0.0, min(float(validated.durationMs), 120000.0))
        scenario = validated.scenario
        if scenario not in main_module.PAGE_EDITOR_PERF_SCENARIOS:
            raise HTTPException(
                status_code=400, detail="지원하지 않는 성능 시나리오입니다"
            )
        main_module._record_page_editor_perf(
            scenario=scenario,
            duration_ms=duration_ms,
            source=validated.source,
        )
        source = (validated.source or "ui").strip() or "ui"
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type=f"page_perf_{scenario}",
            target_type="page",
            target_id=main_module.page_action_target_id(validated.pageId),
            reason=f"duration_ms={duration_ms:.2f}; source={source}",
        )
        return {"ok": True}

    @app.get("/api/admin/stats")
    def get_admin_stats_endpoint(
        current_user: object = Depends(main_module.require_admin),
    ):
        _ = current_user
        return main_module.get_admin_stats()

    @app.get("/api/admin/integrations/oauth")
    def get_admin_oauth_settings(
        current_user: object = Depends(main_module.require_admin),
    ):
        _ = current_user
        settings = main_module.get_effective_oauth_settings()
        return {
            "google_oauth_enabled": settings["google_oauth_enabled"],
            "google_redirect_uri": settings["google_redirect_uri"],
            "google_frontend_redirect_uri": settings["google_frontend_redirect_uri"],
        }

    @app.patch("/api/admin/integrations/oauth")
    def update_admin_oauth_settings(
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminOAuthSettingsPayload,
            admin_oauth_settings_update_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        google_redirect_uri = (validated.google_redirect_uri or "").strip() or None
        google_frontend_redirect_uri = (
            validated.google_frontend_redirect_uri or ""
        ).strip() or None
        updated = main_module.update_oauth_runtime_settings(
            google_oauth_enabled=validated.google_oauth_enabled,
            google_redirect_uri=google_redirect_uri,
            google_frontend_redirect_uri=google_frontend_redirect_uri,
        )
        if not updated:
            raise HTTPException(
                status_code=500, detail="OAuth 설정 저장에 실패했습니다"
            )
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="oauth_settings_updated",
            target_type="moderation_settings",
            target_id="11111111-1111-1111-1111-111111111111",
            reason="OAuth 런타임 설정 변경",
        )
        settings = main_module.get_effective_oauth_settings()
        return {
            "google_oauth_enabled": settings["google_oauth_enabled"],
            "google_redirect_uri": settings["google_redirect_uri"],
            "google_frontend_redirect_uri": settings["google_frontend_redirect_uri"],
        }

    @app.get("/api/admin/integrations/oauth/health")
    def get_admin_oauth_health(
        current_user: object = Depends(main_module.require_admin),
    ):
        _ = current_user
        settings = main_module.get_effective_oauth_settings()
        has_client_id = bool(main_module.GOOGLE_CLIENT_ID)
        has_client_secret = bool(main_module.GOOGLE_CLIENT_SECRET)
        return {
            "google_oauth_enabled": settings["google_oauth_enabled"],
            "has_client_id": has_client_id,
            "has_client_secret": has_client_secret,
            "google_redirect_uri": settings["google_redirect_uri"],
            "google_frontend_redirect_uri": settings["google_frontend_redirect_uri"],
            "is_ready": settings["google_oauth_enabled"]
            and has_client_id
            and has_client_secret
            and bool(settings["google_redirect_uri"])
            and bool(settings["google_frontend_redirect_uri"]),
        }

    @app.get("/api/admin/action-logs")
    def list_admin_action_logs(
        limit: int = 50,
        action_type: Optional[str] = None,
        actor_id: Optional[str] = None,
        page_id: Optional[str] = None,
        current_user: object = Depends(main_module.require_admin),
    ):
        _ = current_user
        settings = main_module.get_effective_moderation_settings()
        view_window_days = cast(int, settings["admin_log_view_window_days"])
        mask_reasons = bool(settings.get("admin_log_mask_reasons", True))
        page_target_id = main_module.page_action_target_id(page_id) if page_id else None
        logs = main_module.get_admin_action_logs(
            limit=limit,
            view_window_days=view_window_days,
            action_type=(action_type or None),
            actor_id=(actor_id or None),
            target_type="page" if page_target_id else None,
            target_id=page_target_id,
        )
        for log in logs:
            log["id"] = str(log["id"])
            if log.get("admin_id"):
                log["admin_id"] = str(log["admin_id"])
            log["target_id"] = str(log["target_id"])
            log["reason"] = main_module.mask_sensitive_reason(
                cast(Optional[str], log.get("reason")),
                mask_reasons,
            )
        return {"items": logs, "next_cursor": None}

    @app.get("/api/admin/action-logs/observability")
    def get_admin_action_logs_observability(
        window_days: int = 30,
        current_user: object = Depends(main_module.require_admin),
    ):
        _ = current_user
        normalized_window = max(1, min(window_days, 90))
        return main_module.get_admin_action_observability(
            view_window_days=normalized_window
        )

    @app.get("/api/admin/users")
    def list_admin_users(
        limit: int = 200,
        current_user: object = Depends(main_module.require_admin),
    ):
        _ = current_user
        users = main_module.get_admin_users(limit=limit)
        for user in users:
            user["id"] = str(user["id"])
            if user.get("suspended_by"):
                user["suspended_by"] = str(user["suspended_by"])
            if user.get("deleted_by"):
                user["deleted_by"] = str(user["deleted_by"])
        return {"items": users, "next_cursor": None}

    @app.patch("/api/admin/users/{user_id}/role")
    def update_admin_user_role(
        user_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_super_admin),
    ):
        validated = cast(
            AdminUserRolePayload,
            admin_user_role_update_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        if str(current_user["id"]) == user_id:
            raise HTTPException(
                status_code=400, detail="본인 계정 권한은 변경할 수 없습니다"
            )
        target_user = main_module.get_user_by_id(user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        target_role = target_user.get("role")
        if target_role == "super_admin":
            raise HTTPException(
                status_code=403, detail="슈퍼 관리자 권한은 변경할 수 없습니다"
            )
        if target_role == validated.role:
            target_user["id"] = str(target_user["id"])
            return target_user
        updated_user = main_module.set_user_role(user_id=user_id, role=validated.role)
        if not updated_user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        change_reason = (validated.reason or "").strip()
        from_role = str(target_role) if target_role is not None else "unknown"
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="user_role_updated",
            target_type="user",
            target_id=user_id,
            reason=change_reason or f"role:{from_role}->{validated.role}",
        )
        updated_user["id"] = str(updated_user["id"])
        if updated_user.get("suspended_by"):
            updated_user["suspended_by"] = str(updated_user["suspended_by"])
        if updated_user.get("deleted_by"):
            updated_user["deleted_by"] = str(updated_user["deleted_by"])
        return updated_user

    @app.get("/api/admin/projects")
    def list_admin_projects(
        status: Optional[str] = None,
        limit: int = 200,
        current_user: object = Depends(main_module.require_admin),
    ):
        _ = current_user
        projects = main_module.get_admin_projects(status=status, limit=limit)
        for project in projects:
            project["id"] = str(project["id"])
            project["author_id"] = str(project["author_id"])
        return {"items": projects, "next_cursor": None}

    @app.patch("/api/admin/projects/{project_id}")
    def update_admin_project(
        project_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminProjectUpdatePayload,
            admin_project_update_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        updates = cast(dict[str, object], validated.model_dump(exclude_none=True))
        raw_reason = updates.pop("reason", None)
        reason = main_module.require_action_reason(
            raw_reason if isinstance(raw_reason, str) else None
        )
        if not updates:
            raise HTTPException(
                status_code=400, detail="변경할 프로젝트 필드가 없습니다"
            )
        updated = main_module.update_project_admin(project_id, updates)
        if not updated:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
        main_module._invalidate_projects_cache()
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="project_updated",
            target_type="project",
            target_id=project_id,
            reason=reason,
        )
        updated["id"] = str(updated["id"])
        updated["author_id"] = str(updated["author_id"])
        return updated

    @app.post("/api/admin/projects/{project_id}/hide")
    def hide_admin_project(
        project_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminActionReasonPayload,
            admin_action_reason_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        reason = main_module.require_action_reason(validated.reason)
        updated = main_module.set_project_status(project_id=project_id, status="hidden")
        if not updated:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
        main_module._invalidate_projects_cache()
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="project_hidden",
            target_type="project",
            target_id=project_id,
            reason=reason,
        )
        updated["id"] = str(updated["id"])
        updated["author_id"] = str(updated["author_id"])
        return updated

    @app.post("/api/admin/projects/{project_id}/restore")
    def restore_admin_project(
        project_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminActionReasonPayload,
            admin_action_reason_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        reason = main_module.require_action_reason(validated.reason)
        updated = main_module.set_project_status(
            project_id=project_id, status="published"
        )
        if not updated:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
        main_module._invalidate_projects_cache()
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="project_restored",
            target_type="project",
            target_id=project_id,
            reason=reason,
        )
        updated["id"] = str(updated["id"])
        updated["author_id"] = str(updated["author_id"])
        return updated

    @app.delete("/api/admin/projects/{project_id}")
    def delete_admin_project(
        project_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminActionReasonPayload,
            admin_action_reason_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        reason = main_module.require_action_reason(validated.reason)
        updated = main_module.set_project_status(
            project_id=project_id, status="deleted"
        )
        if not updated:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
        main_module._invalidate_projects_cache()
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="project_deleted",
            target_type="project",
            target_id=project_id,
            reason=reason,
        )
        updated["id"] = str(updated["id"])
        updated["author_id"] = str(updated["author_id"])
        return updated

    @app.post("/api/admin/users/{user_id}/limit")
    def limit_user_endpoint(
        user_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminUserLimitPayload,
            admin_user_limit_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        main_module.validate_enforcement_target(
            user_id,
            current_user,
            allow_admin_target=current_user.get("role") == "super_admin",
        )
        if validated.hours <= 0:
            raise HTTPException(status_code=400, detail="hours는 1 이상이어야 합니다")
        limited_user = main_module.limit_user(
            user_id=user_id,
            hours=validated.hours,
            reason=validated.reason,
            allow_admin_target=current_user.get("role") == "super_admin",
        )
        if not limited_user:
            raise HTTPException(
                status_code=404, detail="사용자를 찾을 수 없거나 제한할 수 없습니다"
            )
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="user_limited",
            target_type="user",
            target_id=user_id,
            reason=validated.reason,
        )
        limited_user["id"] = str(limited_user["id"])
        return limited_user

    @app.delete("/api/admin/users/{user_id}/limit")
    def unlimit_user_endpoint(
        user_id: str,
        current_user: object = Depends(main_module.require_admin),
    ):
        current_user = cast(dict[str, object], current_user)
        main_module.validate_enforcement_target(
            user_id,
            current_user,
            allow_admin_target=current_user.get("role") == "super_admin",
        )
        released_user = main_module.unlimit_user(
            user_id=user_id,
            allow_admin_target=current_user.get("role") == "super_admin",
        )
        if not released_user:
            raise HTTPException(
                status_code=404, detail="사용자를 찾을 수 없거나 해제할 수 없습니다"
            )
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="user_unlimited",
            target_type="user",
            target_id=user_id,
            reason="제한 해제",
        )
        released_user["id"] = str(released_user["id"])
        return released_user

    @app.post("/api/admin/users/{user_id}/suspend")
    def suspend_user_endpoint(
        user_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminActionReasonPayload,
            admin_action_reason_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        main_module.validate_enforcement_target(
            user_id,
            current_user,
            allow_admin_target=current_user.get("role") == "super_admin",
        )
        reason = main_module.require_action_reason(validated.reason)
        suspended_user = main_module.suspend_user(
            user_id=user_id,
            admin_id=str(current_user["id"]),
            reason=reason,
            allow_admin_target=current_user.get("role") == "super_admin",
        )
        if not suspended_user:
            raise HTTPException(
                status_code=404, detail="사용자를 찾을 수 없거나 정지할 수 없습니다"
            )
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="user_suspended",
            target_type="user",
            target_id=user_id,
            reason=reason,
        )
        suspended_user["id"] = str(suspended_user["id"])
        if suspended_user.get("suspended_by"):
            suspended_user["suspended_by"] = str(suspended_user["suspended_by"])
        return suspended_user

    @app.delete("/api/admin/users/{user_id}/suspend")
    def unsuspend_user_endpoint(
        user_id: str,
        current_user: object = Depends(main_module.require_admin),
    ):
        current_user = cast(dict[str, object], current_user)
        main_module.validate_enforcement_target(
            user_id,
            current_user,
            allow_admin_target=current_user.get("role") == "super_admin",
        )
        released_user = main_module.unsuspend_user(user_id=user_id)
        if not released_user:
            raise HTTPException(
                status_code=404,
                detail="사용자를 찾을 수 없거나 정지 해제할 수 없습니다",
            )
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="user_unsuspended",
            target_type="user",
            target_id=user_id,
            reason="계정 정지 해제",
        )
        released_user["id"] = str(released_user["id"])
        return released_user

    @app.post("/api/admin/users/{user_id}/tokens/revoke")
    def revoke_user_tokens_endpoint(
        user_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminActionReasonPayload,
            admin_action_reason_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        main_module.validate_enforcement_target(
            user_id,
            current_user,
            allow_admin_target=current_user.get("role") == "super_admin",
        )
        reason = (
            validated.reason.strip()
            if isinstance(validated.reason, str)
            else "세션 무효화"
        )
        updated_user = main_module.revoke_user_tokens(user_id=user_id)
        if not updated_user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="user_tokens_revoked",
            target_type="user",
            target_id=user_id,
            reason=reason,
        )
        updated_user["id"] = str(updated_user["id"])
        if updated_user.get("suspended_by"):
            updated_user["suspended_by"] = str(updated_user["suspended_by"])
        return updated_user

    @app.post("/api/admin/users/{user_id}/delete-schedule")
    def schedule_user_delete_endpoint(
        user_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminUserDeleteSchedulePayload,
            admin_user_delete_schedule_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        main_module.validate_enforcement_target(
            user_id,
            current_user,
            allow_admin_target=current_user.get("role") == "super_admin",
        )
        if validated.days < 1:
            raise HTTPException(status_code=400, detail="days는 1 이상이어야 합니다")
        reason = main_module.require_action_reason(validated.reason)
        scheduled_user = main_module.schedule_user_deletion(
            user_id=user_id,
            admin_id=str(current_user["id"]),
            days=validated.days,
            reason=reason,
            allow_admin_target=current_user.get("role") == "super_admin",
        )
        if not scheduled_user:
            raise HTTPException(
                status_code=404,
                detail="사용자를 찾을 수 없거나 삭제 예약할 수 없습니다",
            )
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="user_delete_scheduled",
            target_type="user",
            target_id=user_id,
            reason=f"days={validated.days}, reason={reason}",
        )
        scheduled_user["id"] = str(scheduled_user["id"])
        if scheduled_user.get("suspended_by"):
            scheduled_user["suspended_by"] = str(scheduled_user["suspended_by"])
        return scheduled_user

    @app.delete("/api/admin/users/{user_id}/delete-schedule")
    def cancel_user_delete_schedule_endpoint(
        user_id: str,
        current_user: object = Depends(main_module.require_admin),
    ):
        current_user = cast(dict[str, object], current_user)
        main_module.validate_enforcement_target(
            user_id,
            current_user,
            allow_admin_target=current_user.get("role") == "super_admin",
        )
        restored_user = main_module.cancel_user_deletion(
            user_id=user_id,
            allow_admin_target=current_user.get("role") == "super_admin",
        )
        if not restored_user:
            raise HTTPException(
                status_code=404,
                detail="삭제 예약 상태 사용자를 찾을 수 없거나 예약 취소할 수 없습니다",
            )
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="user_delete_schedule_canceled",
            target_type="user",
            target_id=user_id,
            reason="삭제 예약 취소",
        )
        restored_user["id"] = str(restored_user["id"])
        return restored_user

    @app.post("/api/admin/users/{user_id}/delete-now")
    def delete_user_now_endpoint(
        user_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_super_admin),
    ):
        validated = cast(
            AdminActionReasonPayload,
            admin_action_reason_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        main_module.validate_enforcement_target(
            user_id, current_user, allow_admin_target=True
        )
        reason = main_module.require_action_reason(validated.reason)
        deleted_user = main_module.delete_user_now(
            user_id=user_id,
            admin_id=str(current_user["id"]),
            reason=reason,
            allow_admin_target=True,
        )
        if not deleted_user:
            raise HTTPException(
                status_code=404, detail="사용자를 찾을 수 없거나 삭제할 수 없습니다"
            )
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="user_deleted",
            target_type="user",
            target_id=user_id,
            reason=reason,
        )
        deleted_user["id"] = str(deleted_user["id"])
        if deleted_user.get("suspended_by"):
            deleted_user["suspended_by"] = str(deleted_user["suspended_by"])
        if deleted_user.get("deleted_by"):
            deleted_user["deleted_by"] = str(deleted_user["deleted_by"])
        return deleted_user

    @app.post("/api/admin/users/{user_id}/approve")
    def approve_user_endpoint(
        user_id: str,
        current_user: object = Depends(main_module.require_admin),
    ):
        current_user = cast(dict[str, object], current_user)
        approved_user = main_module.approve_user(user_id=user_id)
        if not approved_user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="user_approved",
            target_type="user",
            target_id=user_id,
            reason="가입 승인",
        )
        approved_user["id"] = str(approved_user["id"])
        return approved_user

    @app.post("/api/admin/users/{user_id}/reject")
    def reject_user_endpoint(
        user_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminActionReasonPayload,
            admin_action_reason_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        reason = main_module.require_action_reason(validated.reason)
        rejected_user = main_module.reject_user(user_id=user_id)
        if not rejected_user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="user_rejected",
            target_type="user",
            target_id=user_id,
            reason=reason,
        )
        rejected_user["id"] = str(rejected_user["id"])
        return rejected_user

    @app.patch("/api/admin/reports/{report_id}")
    def update_report_endpoint(
        report_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminReportUpdatePayload,
            admin_report_update_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        updated = main_module.update_report(report_id, validated.status)
        if not updated:
            raise HTTPException(status_code=404, detail="신고를 찾을 수 없습니다")
        updated["id"] = str(updated["id"])
        if updated.get("reporter_id"):
            updated["reporter_id"] = str(updated["reporter_id"])
        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type=f"report_{validated.status}",
            target_type="report",
            target_id=report_id,
            reason=validated.reason,
        )
        return updated
