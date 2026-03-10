from __future__ import annotations

from types import ModuleType
from typing import Protocol, cast

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel


class AboutContentUpdatePayload(Protocol):
    reason: str | None

    def model_dump(self, *, exclude: set[str] | None = None) -> dict[str, object]: ...


def register_about_content_routes(
    app: FastAPI,
    main_module: ModuleType,
    about_content_update_request_model: type[BaseModel],
) -> None:
    @app.get("/api/content/about")
    def get_about_content_endpoint():
        return main_module.get_about_content_payload()

    @app.patch("/api/admin/content/about")
    def update_about_content_endpoint(
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AboutContentUpdatePayload,
            about_content_update_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        reason = main_module.require_action_reason(validated.reason)
        content = validated.model_dump(exclude={"reason"})
        updated = main_module.upsert_site_content(
            main_module.ABOUT_CONTENT_KEY, content
        )
        if not updated:
            raise HTTPException(
                status_code=500, detail="소개 페이지 저장에 실패했습니다"
            )

        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="about_content_updated",
            target_type="content",
            target_id=main_module.ABOUT_CONTENT_TARGET_ID,
            reason=reason,
        )

        response = updated["content_json"]
        response["updated_at"] = updated.get("updated_at")
        return response
