from __future__ import annotations

from types import ModuleType
from typing import Optional, Protocol, cast

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel


class ReportCreatePayload(Protocol):
    reason: str
    memo: str | None


class ProjectCreatePayload(Protocol):
    title: str
    summary: str
    description: str | None

    def model_dump(self) -> dict[str, object]: ...


class ProjectUpdatePayload(Protocol):
    def model_dump(self, *, exclude_none: bool = False) -> dict[str, object]: ...


class CommentCreatePayload(Protocol):
    content: str


def register_public_api_routes(
    app: FastAPI,
    main_module: ModuleType,
    report_create_model: type[BaseModel],
    project_create_model: type[BaseModel],
    project_update_request_model: type[BaseModel],
    comment_create_model: type[BaseModel],
) -> None:
    @app.get("/api/projects")
    def list_projects(
        sort: str = "latest",
        platform: Optional[str] = None,
        tag: Optional[str] = None,
    ):
        request_started = main_module.time.perf_counter()
        normalized_sort = "popular" if sort == "popular" else "latest"
        try:
            cached_items = main_module._get_cached_projects(
                sort=normalized_sort,
                platform=platform,
                tag=tag,
            )
            if cached_items is not None:
                for project in cached_items:
                    project["id"] = str(project["id"])
                    project["author_id"] = str(project["author_id"])
                elapsed_ms = (main_module.time.perf_counter() - request_started) * 1000
                main_module._record_project_perf(
                    elapsed_ms=elapsed_ms,
                    db_ms=0.0,
                    cache_hit=True,
                )
                print(
                    f"[perf] /api/projects cache_hit=1 sort={normalized_sort} platform={platform} tag={tag} elapsed_ms={elapsed_ms:.2f}"
                )
                return {"items": cached_items, "next_cursor": None}

            db_started = main_module.time.perf_counter()
            projects = main_module.get_projects(
                sort=normalized_sort,
                platform=platform,
                tag=tag,
            )
            db_ms = (main_module.time.perf_counter() - db_started) * 1000
            main_module._set_cached_projects(
                sort=normalized_sort,
                platform=platform,
                tag=tag,
                items=projects,
            )
            for project in projects:
                project["id"] = str(project["id"])
                project["author_id"] = str(project["author_id"])
            elapsed_ms = (main_module.time.perf_counter() - request_started) * 1000
            main_module._record_project_perf(
                elapsed_ms=elapsed_ms,
                db_ms=db_ms,
                cache_hit=False,
            )
            print(
                f"[perf] /api/projects cache_hit=0 sort={normalized_sort} platform={platform} tag={tag} db_ms={db_ms:.2f} elapsed_ms={elapsed_ms:.2f}"
            )
            return {"items": projects, "next_cursor": None}
        except Exception as error:
            print(f"Error fetching projects: {error}")
            return {"items": [], "next_cursor": None}

    @app.get("/api/projects/{project_id}")
    def get_project_detail(project_id: str):
        project = main_module.get_project(project_id)
        if not project or project.get("status") != "published":
            raise HTTPException(status_code=404, detail="Project not found")
        project["id"] = str(project["id"])
        project["author_id"] = str(project["author_id"])
        return project

    @app.get("/api/projects/{project_id}/comments")
    def list_comments(project_id: str, sort: str = "latest"):
        comments = main_module.get_comments(project_id, sort=sort)
        for comment in comments:
            comment["id"] = str(comment["id"])
            comment["project_id"] = str(comment["project_id"])
            comment["author_id"] = str(comment["author_id"])
            if comment.get("parent_id"):
                comment["parent_id"] = str(comment["parent_id"])
        return {"items": comments, "next_cursor": None}

    @app.post("/api/comments/{comment_id}/report")
    def report_comment_endpoint(comment_id: str, payload: dict[str, object]):
        validated = cast(
            ReportCreatePayload, report_create_model.model_validate(payload)
        )
        new_report = main_module.report_comment(
            comment_id=comment_id,
            reason=validated.reason,
            memo=validated.memo,
        )
        if not new_report:
            raise HTTPException(status_code=500, detail="신고 생성에 실패했습니다")
        new_report["id"] = str(new_report["id"])
        if new_report.get("reporter_id"):
            new_report["reporter_id"] = str(new_report["reporter_id"])
        return new_report

    @app.post("/api/projects/{project_id}/like")
    def like_project_endpoint(
        project_id: str,
        current_user: object = Depends(main_module.get_current_user),
    ):
        current_user = cast(dict[str, object], current_user)
        try:
            like_count = main_module.like_project(project_id, str(current_user["id"]))
            main_module._invalidate_projects_cache()
            return {"like_count": like_count}
        except Exception:
            raise HTTPException(status_code=404, detail="Project not found")

    @app.delete("/api/projects/{project_id}/like")
    def unlike_project_endpoint(
        project_id: str,
        current_user: object = Depends(main_module.get_current_user),
    ):
        current_user = cast(dict[str, object], current_user)
        try:
            like_count = main_module.unlike_project(project_id, str(current_user["id"]))
            main_module._invalidate_projects_cache()
            return {"like_count": like_count}
        except Exception:
            raise HTTPException(status_code=404, detail="Project not found")

    @app.patch("/api/projects/{project_id}")
    def update_project_endpoint(
        project_id: str,
        payload: dict[str, object],
        current_user: object = Depends(main_module.get_current_user),
    ):
        validated = cast(
            ProjectUpdatePayload,
            project_update_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        existing = main_module.get_project(project_id)
        if not existing:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
        is_admin = current_user.get("role") in main_module.ADMIN_ALLOWED_ROLES
        is_owner = str(existing.get("author_id")) == str(current_user.get("id"))
        if not is_admin and not is_owner:
            raise HTTPException(status_code=403, detail="수정 권한이 없습니다")
        updates = validated.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(
                status_code=400, detail="변경할 프로젝트 필드가 없습니다"
            )

        content_for_check = " ".join(
            [
                cast(str, updates.get("title", existing.get("title", "")) or ""),
                cast(str, updates.get("summary", existing.get("summary", "")) or ""),
                cast(
                    str,
                    updates.get("description", existing.get("description", "")) or "",
                ),
            ]
        )
        settings = main_module.get_effective_moderation_settings()
        blocked_keywords = cast(list[str], settings["blocked_keywords"])
        if main_module.text_contains_blocked_keyword(
            content_for_check, blocked_keywords
        ):
            raise HTTPException(
                status_code=400, detail="금칙어가 포함된 내용은 수정할 수 없습니다"
            )

        updated = main_module.update_project_owner_fields(project_id, updates)
        if not updated:
            raise HTTPException(status_code=500, detail="프로젝트 수정에 실패했습니다")
        main_module._invalidate_projects_cache()
        updated["id"] = str(updated["id"])
        updated["author_id"] = str(updated["author_id"])
        return updated

    @app.post("/api/projects")
    def create_project_endpoint(
        project: dict[str, object],
        current_user: object = Depends(main_module.get_current_user),
    ):
        validated = cast(
            ProjectCreatePayload, project_create_model.model_validate(project)
        )
        current_user = cast(dict[str, object], current_user)
        settings = main_module.get_effective_moderation_settings()
        content_for_check = " ".join(
            [validated.title, validated.summary, validated.description or ""]
        )
        blocked_keywords = cast(list[str], settings["blocked_keywords"])
        if main_module.text_contains_blocked_keyword(
            content_for_check, blocked_keywords
        ):
            raise HTTPException(
                status_code=400, detail="금칙어가 포함된 내용은 등록할 수 없습니다"
            )

        payload = validated.model_dump()
        payload["author_id"] = str(current_user["id"])
        new_project = main_module.create_project(payload)
        if not new_project:
            raise HTTPException(status_code=500, detail="프로젝트 생성에 실패했습니다")
        main_module._invalidate_projects_cache()
        new_project["id"] = str(new_project["id"])
        new_project["author_id"] = str(new_project["author_id"])
        return new_project

    @app.post("/api/projects/{project_id}/comments")
    def create_comment_endpoint(
        project_id: str,
        comment: dict[str, object],
        current_user: object = Depends(main_module.get_current_user),
    ):
        validated = cast(
            CommentCreatePayload, comment_create_model.model_validate(comment)
        )
        current_user = cast(dict[str, object], current_user)
        settings = main_module.get_effective_moderation_settings()
        blocked_keywords = cast(list[str], settings["blocked_keywords"])
        if main_module.text_contains_blocked_keyword(
            validated.content, blocked_keywords
        ):
            raise HTTPException(
                status_code=400, detail="금칙어가 포함된 댓글은 작성할 수 없습니다"
            )

        new_comment = main_module.create_comment(
            project_id=project_id,
            content=validated.content,
            author_id=str(current_user["id"]),
        )
        if not new_comment:
            raise HTTPException(status_code=500, detail="댓글 작성에 실패했습니다")
        new_comment["id"] = str(new_comment["id"])
        new_comment["project_id"] = str(new_comment["project_id"])
        new_comment["author_id"] = str(new_comment["author_id"])
        return new_comment
