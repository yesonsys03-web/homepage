from __future__ import annotations

from datetime import datetime, timezone
from types import ModuleType
from typing import Mapping, Optional, Protocol, cast

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel


class PageDocumentPayloadLike(Protocol):
    pageId: str

    def model_dump(self) -> dict[str, object]: ...


class AdminPageDraftUpdatePayload(Protocol):
    baseVersion: int
    document: PageDocumentPayloadLike
    reason: str | None
    source: str


class AdminPagePublishPayload(Protocol):
    reason: str | None
    draftVersion: int | None


class AdminPagePublishScheduleCreatePayload(Protocol):
    publishAt: str
    timezone: str | None
    reason: str | None
    draftVersion: int | None


class AdminPagePublishScheduleActionPayload(Protocol):
    reason: str | None


class AdminPagePublishScheduleProcessPayload(Protocol):
    limit: int
    reason: str | None


class AdminPageRollbackPayload(Protocol):
    targetVersion: int
    reason: str | None
    publishNow: bool


class AdminPageMigrationExecutePayload(Protocol):
    reason: str | None
    dryRun: bool


class AdminPageMigrationRestorePayload(Protocol):
    backupKey: str
    reason: str | None
    dryRun: bool


def register_admin_page_editor_routes(
    app: FastAPI,
    main_module: ModuleType,
    admin_page_draft_update_request_model: type[BaseModel],
    admin_page_publish_request_model: type[BaseModel],
    admin_page_publish_schedule_create_request_model: type[BaseModel],
    admin_page_publish_schedule_action_request_model: type[BaseModel],
    admin_page_publish_schedule_process_request_model: type[BaseModel],
    admin_page_rollback_request_model: type[BaseModel],
    admin_page_migration_execute_request_model: type[BaseModel],
    admin_page_migration_restore_request_model: type[BaseModel],
) -> None:
    @app.get("/api/admin/pages/{page_id}/migration/preview")
    def get_admin_page_migration_preview(
        page_id: str,
        current_user: object = Depends(main_module.require_super_admin),
    ):
        _ = current_user
        return main_module.build_page_migration_preview(page_id)

    @app.get("/api/admin/pages/{page_id}/migration/backups")
    def get_admin_page_migration_backups(
        page_id: str,
        limit: int = 20,
        current_user: object = Depends(main_module.require_super_admin),
    ):
        _ = current_user
        return main_module.list_page_migration_backups(page_id, limit=limit)

    @app.post("/api/admin/pages/{page_id}/migration/execute")
    def execute_admin_page_migration(
        page_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_super_admin),
    ):
        validated = cast(
            AdminPageMigrationExecutePayload,
            admin_page_migration_execute_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        reason = main_module.require_action_reason(validated.reason)
        return main_module.execute_page_migration(
            page_id=page_id,
            actor_id=str(current_user["id"]),
            reason=reason,
            dry_run=validated.dryRun,
        )

    @app.post("/api/admin/pages/{page_id}/migration/restore")
    def restore_admin_page_migration(
        page_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_super_admin),
    ):
        validated = cast(
            AdminPageMigrationRestorePayload,
            admin_page_migration_restore_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        reason = main_module.require_action_reason(validated.reason)
        return main_module.restore_page_migration_backup(
            page_id=page_id,
            backup_key=validated.backupKey.strip(),
            actor_id=str(current_user["id"]),
            reason=reason,
            dry_run=validated.dryRun,
        )

    @app.get("/api/admin/pages/{page_id}/draft")
    def get_admin_page_draft(
        page_id: str,
        current_user: object = Depends(main_module.require_admin),
    ):
        current_user = cast(dict[str, object], current_user)
        main_module.enforce_page_editor_rollout_access(current_user)
        draft = main_module.get_page_document_draft(page_id)
        if draft and draft.get("document_json"):
            document = cast(dict[str, object], draft["document_json"])
            document["version"] = int(draft.get("draft_version", 0))
            document["updatedAt"] = str(draft.get("updated_at") or "")
            document["updatedBy"] = str(draft.get("updated_by") or "system")
            return {
                "pageId": page_id,
                "baseVersion": int(draft.get("draft_version", 0)),
                "publishedVersion": int(draft.get("published_version", 0)),
                "document": document,
            }

        if page_id == main_module.ABOUT_CONTENT_KEY:
            about_payload = main_module.get_about_content_payload()
            document = main_module.build_page_document_from_about_content(
                page_id,
                about_payload,
                0,
            )
            return {
                "pageId": page_id,
                "baseVersion": 0,
                "publishedVersion": 0,
                "document": document,
            }

        return {
            "pageId": page_id,
            "baseVersion": 0,
            "publishedVersion": 0,
            "document": {
                "pageId": page_id,
                "status": "draft",
                "version": 0,
                "title": "Untitled Page",
                "seo": {
                    "metaTitle": "",
                    "metaDescription": "",
                    "ogImage": None,
                },
                "blocks": [],
                "updatedBy": "system",
                "updatedAt": "",
            },
        }

    @app.put("/api/admin/pages/{page_id}/draft")
    def update_admin_page_draft(
        page_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminPageDraftUpdatePayload,
            admin_page_draft_update_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        main_module.enforce_page_editor_rollout_access(current_user)
        if validated.document.pageId != page_id:
            raise HTTPException(
                status_code=400, detail="pageId가 경로와 일치하지 않습니다"
            )

        issues = main_module.collect_page_document_issues(
            validated.document.model_dump()
        )
        blocking_errors = issues["blocking"]
        if blocking_errors:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "page_validation_failed",
                    "message": "페이지 문서 검증에 실패했습니다",
                    "field_errors": blocking_errors,
                    "warnings": issues["warnings"],
                },
            )

        result = main_module.save_page_document_draft(
            page_id=page_id,
            base_version=validated.baseVersion,
            document_json=validated.document.model_dump(),
            actor_id=str(current_user["id"]),
            reason=validated.reason,
        )
        if cast(bool, result.get("conflict", False)):
            current_updated_at = result.get("current_updated_at")
            current_updated_at_text = (
                current_updated_at.isoformat()
                if isinstance(current_updated_at, datetime)
                else (
                    str(current_updated_at) if current_updated_at is not None else None
                )
            )
            main_module.write_admin_action_log(
                admin_id=str(current_user["id"]),
                action_type="page_conflict_detected",
                target_type="page",
                target_id=main_module.page_action_target_id(page_id),
                reason=(validated.reason or "draft conflict").strip(),
                metadata={
                    "page_id": page_id,
                    "source": validated.source,
                    "base_version": validated.baseVersion,
                    "current_version": cast(int, result.get("current_version", 0)),
                    "retryable": True,
                },
            )
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "page_version_conflict",
                    "message": "다른 편집 내용이 먼저 저장되었습니다",
                    "current_version": cast(int, result.get("current_version", 0)),
                    "current_updated_by": result.get("current_updated_by"),
                    "current_updated_at": current_updated_at_text,
                    "retryable": True,
                    "field_errors": [],
                },
            )

        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="page_draft_saved",
            target_type="page",
            target_id=main_module.page_action_target_id(page_id),
            reason=f"source={validated.source}; reason={(validated.reason or 'draft save').strip()}",
            metadata={
                "page_id": page_id,
                "source": validated.source,
                "base_version": validated.baseVersion,
                "saved_version": cast(int, result.get("saved_version", 0)),
            },
        )

        saved_version = cast(int, result.get("saved_version", 0))
        response_doc = validated.document.model_dump()
        response_doc["version"] = saved_version
        response_doc["updatedBy"] = str(current_user["id"])

        return {
            "savedVersion": saved_version,
            "document": response_doc,
            "warnings": issues["warnings"],
        }

    @app.post("/api/admin/pages/{page_id}/publish")
    def publish_admin_page(
        page_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_super_admin),
    ):
        validated = cast(
            AdminPagePublishPayload,
            admin_page_publish_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        main_module.enforce_page_editor_rollout_access(current_user)
        reason = main_module.require_action_reason(validated.reason)

        current_draft = main_module.get_page_document_draft(page_id)
        if not current_draft:
            raise HTTPException(
                status_code=404, detail="게시할 draft를 찾을 수 없습니다"
            )

        current_draft_version = int(current_draft.get("draft_version", 0))
        target_draft_version = (
            int(validated.draftVersion)
            if validated.draftVersion is not None
            else current_draft_version
        )

        if (
            validated.draftVersion is not None
            and target_draft_version != current_draft_version
        ):
            main_module.write_admin_action_log(
                admin_id=str(current_user["id"]),
                action_type="page_publish_failed",
                target_type="page",
                target_id=main_module.page_action_target_id(page_id),
                reason=f"conflict: expected={target_draft_version}, current={current_draft_version}",
                metadata={
                    "failure_kind": "conflict",
                    "page_id": page_id,
                    "expected_draft_version": target_draft_version,
                    "current_draft_version": current_draft_version,
                },
            )
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "page_publish_conflict",
                    "message": "최신 draft 버전이 아닙니다",
                    "current_version": current_draft_version,
                    "field_errors": [],
                },
            )

        target_version_record = main_module.get_page_document_version(
            page_id,
            target_draft_version,
        )
        if not target_version_record or not target_version_record.get("document_json"):
            raise HTTPException(
                status_code=404, detail="게시할 draft를 찾을 수 없습니다"
            )

        issues = main_module.collect_page_document_issues(
            cast(dict[str, object], target_version_record["document_json"])
        )
        if issues["blocking"]:
            main_module.write_admin_action_log(
                admin_id=str(current_user["id"]),
                action_type="page_publish_failed",
                target_type="page",
                target_id=main_module.page_action_target_id(page_id),
                reason="validation_failed",
                metadata={
                    "failure_kind": "validation_failed",
                    "page_id": page_id,
                    "blocking_error_count": len(issues["blocking"]),
                    "warning_count": len(issues["warnings"]),
                },
            )
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "page_validation_failed",
                    "message": "게시 전 검증에 실패했습니다",
                    "field_errors": issues["blocking"],
                    "warnings": issues["warnings"],
                },
            )

        published = main_module.publish_page_document(
            page_id=page_id,
            actor_id=str(current_user["id"]),
            reason=reason,
            draft_version=target_draft_version,
        )
        if not published:
            raise HTTPException(
                status_code=404, detail="게시할 draft를 찾을 수 없습니다"
            )

        published_version = cast(int, published["published_version"])
        if page_id == main_module.ABOUT_CONTENT_KEY:
            published_doc = main_module.get_page_document_version(
                page_id, published_version
            )
            if published_doc and published_doc.get("document_json"):
                about_payload = main_module.extract_about_content_from_page_document(
                    cast(dict[str, object], published_doc["document_json"])
                )
                _ = main_module.upsert_site_content(
                    main_module.ABOUT_CONTENT_KEY,
                    about_payload,
                )

        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="page_published",
            target_type="page",
            target_id=main_module.page_action_target_id(page_id),
            reason=reason,
            metadata={
                "page_id": page_id,
                "draft_version": target_draft_version,
                "published_version": published_version,
            },
        )

        return {"publishedVersion": published_version}

    @app.get("/api/admin/pages/{page_id}/publish-schedules")
    def list_admin_page_publish_schedules(
        page_id: str,
        limit: int = 50,
        current_user: object = Depends(main_module.require_super_admin),
    ):
        current_user = cast(dict[str, object], current_user)
        main_module.enforce_page_editor_rollout_access(current_user)
        safe_limit = min(max(limit, 1), 100)
        items = [
            main_module.serialize_publish_schedule(item)
            for item in main_module.list_page_publish_schedules(
                page_id=page_id,
                limit=safe_limit,
            )
        ]
        return {"pageId": page_id, "count": len(items), "items": items}

    @app.post("/api/admin/pages/{page_id}/publish-schedules")
    def create_admin_page_publish_schedule(
        page_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_super_admin),
    ):
        validated = cast(
            AdminPagePublishScheduleCreatePayload,
            admin_page_publish_schedule_create_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        main_module.enforce_page_editor_rollout_access(current_user)
        reason = main_module.require_action_reason(validated.reason)

        current_draft = main_module.get_page_document_draft(page_id)
        if not current_draft:
            raise HTTPException(
                status_code=404,
                detail="예약 게시 대상 draft를 찾을 수 없습니다",
            )

        current_draft_version = int(current_draft.get("draft_version", 0))
        target_draft_version = (
            int(validated.draftVersion)
            if validated.draftVersion is not None
            else current_draft_version
        )
        if target_draft_version <= 0:
            raise HTTPException(
                status_code=400,
                detail="예약 게시 대상 draftVersion이 올바르지 않습니다",
            )
        if target_draft_version != current_draft_version:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "page_publish_schedule_conflict",
                    "message": "최신 draft 버전과 예약 대상 버전이 다릅니다",
                    "current_version": current_draft_version,
                    "field_errors": [],
                },
            )

        target_record = main_module.get_page_document_version(
            page_id, target_draft_version
        )
        if not target_record or not target_record.get("document_json"):
            raise HTTPException(
                status_code=404,
                detail="예약 게시 대상 draft를 찾을 수 없습니다",
            )

        issues = main_module.collect_page_document_issues(
            cast(dict[str, object], target_record["document_json"])
        )
        if issues["blocking"]:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "page_validation_failed",
                    "message": "예약 게시 전 검증에 실패했습니다",
                    "field_errors": issues["blocking"],
                    "warnings": issues["warnings"],
                },
            )

        publish_at = main_module.parse_schedule_publish_at(validated.publishAt)
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        if publish_at <= now_utc:
            raise HTTPException(
                status_code=400,
                detail="publishAt은 현재 시각 이후여야 합니다",
            )

        schedule_id = (
            f"ps_{int(main_module.time.time())}_{main_module.secrets.token_hex(4)}"
        )
        record = main_module.create_page_publish_schedule(
            schedule_id=schedule_id,
            page_id=page_id,
            draft_version=target_draft_version,
            publish_at=publish_at.isoformat(sep=" ", timespec="seconds"),
            timezone=(validated.timezone or "Asia/Seoul").strip() or "Asia/Seoul",
            actor_id=str(current_user["id"]),
            reason=reason,
        )

        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="page_publish_scheduled",
            target_type="page",
            target_id=main_module.page_action_target_id(page_id),
            reason=f"schedule_id={schedule_id}; draft_version={target_draft_version}; publish_at={publish_at.isoformat()}; {reason}",
        )

        return {
            "scheduled": True,
            "schedule": main_module.serialize_publish_schedule(
                cast(Mapping[str, object], record or {})
            ),
        }

    @app.post("/api/admin/pages/{page_id}/publish-schedules/{schedule_id}/cancel")
    def cancel_admin_page_publish_schedule(
        page_id: str,
        schedule_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_super_admin),
    ):
        validated = cast(
            AdminPagePublishScheduleActionPayload,
            admin_page_publish_schedule_action_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        main_module.enforce_page_editor_rollout_access(current_user)
        reason = main_module.require_action_reason(validated.reason)
        cancelled = main_module.cancel_page_publish_schedule(
            page_id=page_id,
            schedule_id=schedule_id,
            actor_id=str(current_user["id"]),
            reason=reason,
        )
        if not cancelled:
            raise HTTPException(
                status_code=404,
                detail="취소 가능한 예약 게시를 찾을 수 없습니다",
            )

        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="page_publish_schedule_cancelled",
            target_type="page",
            target_id=main_module.page_action_target_id(page_id),
            reason=f"schedule_id={schedule_id}; {reason}",
        )

        return {
            "cancelled": True,
            "schedule": main_module.serialize_publish_schedule(
                cast(Mapping[str, object], cancelled)
            ),
        }

    @app.post("/api/admin/pages/{page_id}/publish-schedules/{schedule_id}/retry")
    def retry_admin_page_publish_schedule(
        page_id: str,
        schedule_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_super_admin),
    ):
        validated = cast(
            AdminPagePublishScheduleActionPayload,
            admin_page_publish_schedule_action_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        main_module.enforce_page_editor_rollout_access(current_user)
        reason = main_module.require_action_reason(validated.reason)
        retried = main_module.retry_page_publish_schedule(
            page_id=page_id,
            schedule_id=schedule_id,
            actor_id=str(current_user["id"]),
            reason=reason,
        )
        if not retried:
            raise HTTPException(
                status_code=404,
                detail="재시도 가능한 예약 게시를 찾을 수 없습니다",
            )

        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="page_publish_schedule_retry_requested",
            target_type="page",
            target_id=main_module.page_action_target_id(page_id),
            reason=f"schedule_id={schedule_id}; {reason}",
        )

        return {
            "retried": True,
            "schedule": main_module.serialize_publish_schedule(
                cast(Mapping[str, object], retried)
            ),
        }

    @app.post("/api/admin/pages/{page_id}/publish-schedules/process")
    def process_admin_page_publish_schedules(
        page_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_super_admin),
    ):
        validated = cast(
            AdminPagePublishScheduleProcessPayload,
            admin_page_publish_schedule_process_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        main_module.enforce_page_editor_rollout_access(current_user)
        safe_limit = min(max(validated.limit, 1), 50)
        process_reason = (validated.reason or "scheduled publish process").strip()

        due_items = main_module.list_due_page_publish_schedules(
            page_id=page_id,
            limit=safe_limit,
        )
        published_count = 0
        failed_count = 0
        results: list[dict[str, object]] = []

        for row in due_items:
            schedule_id = str(row.get("schedule_id") or "")
            draft_version = int(row.get("draft_version") or 0)

            try:
                current_draft = main_module.get_page_document_draft(page_id)
                if not current_draft:
                    raise RuntimeError("draft_not_found")

                current_draft_version = int(current_draft.get("draft_version", 0))
                if current_draft_version != draft_version:
                    raise RuntimeError(
                        f"draft_version_conflict: scheduled={draft_version}, current={current_draft_version}"
                    )

                published = main_module.publish_page_document(
                    page_id=page_id,
                    actor_id=str(current_user["id"]),
                    reason=f"scheduled_publish:{schedule_id}; {process_reason}",
                    draft_version=draft_version,
                )
                if not published:
                    raise RuntimeError("publish_failed")

                published_version = int(published.get("published_version", 0))
                if page_id == main_module.ABOUT_CONTENT_KEY:
                    published_doc = main_module.get_page_document_version(
                        page_id,
                        published_version,
                    )
                    if published_doc and published_doc.get("document_json"):
                        about_payload = (
                            main_module.extract_about_content_from_page_document(
                                cast(dict[str, object], published_doc["document_json"])
                            )
                        )
                        _ = main_module.upsert_site_content(
                            main_module.ABOUT_CONTENT_KEY,
                            about_payload,
                        )

                _ = main_module.mark_page_publish_schedule_published(
                    page_id=page_id,
                    schedule_id=schedule_id,
                    published_version=published_version,
                )
                main_module.write_admin_action_log(
                    admin_id=str(current_user["id"]),
                    action_type="page_publish_scheduled_executed",
                    target_type="page",
                    target_id=main_module.page_action_target_id(page_id),
                    reason=f"schedule_id={schedule_id}; published_version={published_version}; {process_reason}",
                )
                published_count += 1
                results.append(
                    {
                        "scheduleId": schedule_id,
                        "status": "published",
                        "publishedVersion": published_version,
                    }
                )
            except Exception as exc:
                error_message = str(exc) or "unknown_error"
                _ = main_module.mark_page_publish_schedule_failed(
                    page_id=page_id,
                    schedule_id=schedule_id,
                    error_message=error_message,
                )
                main_module.write_admin_action_log(
                    admin_id=str(current_user["id"]),
                    action_type="page_publish_scheduled_failed",
                    target_type="page",
                    target_id=main_module.page_action_target_id(page_id),
                    reason=f"schedule_id={schedule_id}; error={error_message}; {process_reason}",
                )
                failed_count += 1
                results.append(
                    {
                        "scheduleId": schedule_id,
                        "status": "failed",
                        "error": error_message,
                    }
                )

        return {
            "pageId": page_id,
            "processed": len(results),
            "published": published_count,
            "failed": failed_count,
            "items": results,
        }

    @app.get("/api/admin/pages/{page_id}/versions")
    def list_admin_page_versions(
        page_id: str,
        limit: int = 50,
        current_user: object = Depends(main_module.require_admin),
    ):
        current_user = cast(dict[str, object], current_user)
        main_module.enforce_page_editor_rollout_access(current_user)
        items = main_module.list_page_document_versions(page_id=page_id, limit=limit)
        for item in items:
            item["created_by"] = str(item.get("created_by") or "")
            item["page_id"] = str(item.get("page_id") or page_id)
        return {"items": items, "next_cursor": None}

    @app.get("/api/admin/pages/{page_id}/versions/{version}")
    def get_admin_page_version(
        page_id: str,
        version: int,
        current_user: object = Depends(main_module.require_admin),
    ):
        current_user = cast(dict[str, object], current_user)
        main_module.enforce_page_editor_rollout_access(current_user)
        record = main_module.get_page_document_version(page_id, version)
        if not record:
            raise HTTPException(status_code=404, detail="버전을 찾을 수 없습니다")
        return {
            "pageId": page_id,
            "version": int(record["version"]),
            "status": record["status"],
            "reason": record.get("reason"),
            "createdBy": str(record.get("created_by") or ""),
            "createdAt": str(record.get("created_at") or ""),
            "document": record.get("document_json"),
        }

    @app.get("/api/admin/pages/{page_id}/versions-compare")
    def compare_admin_page_versions(
        page_id: str,
        from_version: int,
        to_version: int,
        current_user: object = Depends(main_module.require_admin),
    ):
        current_user = cast(dict[str, object], current_user)
        main_module.enforce_page_editor_rollout_access(current_user)
        from_record = main_module.get_page_document_version(page_id, from_version)
        to_record = main_module.get_page_document_version(page_id, to_version)
        if not from_record or not to_record:
            raise HTTPException(
                status_code=404, detail="비교 대상 버전을 찾을 수 없습니다"
            )

        from_document = cast(dict[str, object], from_record.get("document_json") or {})
        to_document = cast(dict[str, object], to_record.get("document_json") or {})
        changes = main_module.build_page_document_diff(from_document, to_document)
        return {
            "pageId": page_id,
            "fromVersion": from_version,
            "toVersion": to_version,
            "changes": changes,
            "summary": {
                "total": len(changes),
                "added": len(
                    [change for change in changes if change["kind"] == "block_added"]
                ),
                "removed": len(
                    [change for change in changes if change["kind"] == "block_removed"]
                ),
                "reordered": len(
                    [
                        change
                        for change in changes
                        if change["kind"] == "block_reordered"
                    ]
                ),
                "field_changed": len(
                    [change for change in changes if change["kind"] == "field_changed"]
                ),
            },
        }

    @app.post("/api/admin/pages/{page_id}/rollback")
    def rollback_admin_page(
        page_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_super_admin),
    ):
        validated = cast(
            AdminPageRollbackPayload,
            admin_page_rollback_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        main_module.enforce_page_editor_rollout_access(current_user)
        reason = main_module.require_action_reason(validated.reason)
        restored = main_module.rollback_page_document(
            page_id=page_id,
            target_version=validated.targetVersion,
            actor_id=str(current_user["id"]),
            reason=reason,
            publish_now=validated.publishNow,
        )
        if not restored:
            raise HTTPException(
                status_code=404, detail="복원 대상 버전을 찾을 수 없습니다"
            )

        published_version = cast(Optional[int], restored.get("published_version"))
        if (
            validated.publishNow
            and published_version
            and page_id == main_module.ABOUT_CONTENT_KEY
        ):
            published_doc = main_module.get_page_document_version(
                page_id, published_version
            )
            if published_doc and published_doc.get("document_json"):
                about_payload = main_module.extract_about_content_from_page_document(
                    cast(dict[str, object], published_doc["document_json"])
                )
                _ = main_module.upsert_site_content(
                    main_module.ABOUT_CONTENT_KEY,
                    about_payload,
                )

        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="page_rolled_back",
            target_type="page",
            target_id=main_module.page_action_target_id(page_id),
            reason=reason,
            metadata={
                "page_id": page_id,
                "target_version": validated.targetVersion,
                "restored_draft_version": cast(int, restored["restored_draft_version"]),
                "published_version": published_version,
                "publish_now": validated.publishNow,
            },
        )

        return {
            "restoredDraftVersion": cast(int, restored["restored_draft_version"]),
            "publishedVersion": published_version,
        }
