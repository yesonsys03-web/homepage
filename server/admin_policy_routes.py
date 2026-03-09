from __future__ import annotations

from types import ModuleType
from typing import Protocol, cast

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel


class AdminPolicyUpdatePayload(Protocol):
    blocked_keywords: list[str]
    auto_hide_report_threshold: int
    home_filter_tabs: list[object] | None
    explore_filter_tabs: list[object] | None
    admin_log_retention_days: object
    admin_log_view_window_days: object
    admin_log_mask_reasons: bool | None
    page_editor_enabled: bool | None
    page_editor_rollout_stage: object
    page_editor_pilot_admin_ids: list[str] | None
    page_editor_publish_fail_rate_threshold: object
    page_editor_rollback_ratio_threshold: object
    page_editor_conflict_rate_threshold: object

    def model_dump(self, *, exclude_none: bool = False) -> dict[str, object]: ...


def register_admin_policy_routes(
    app: FastAPI,
    main_module: ModuleType,
    admin_policy_update_request_model: type[BaseModel],
) -> None:
    @app.get("/api/admin/policies")
    def get_admin_policies(
        current_user: object = Depends(main_module.require_admin),
    ):
        _ = current_user
        return main_module.get_effective_moderation_settings()

    @app.patch("/api/admin/policies")
    def update_admin_policies(
        payload: dict[str, object],
        current_user: object = Depends(main_module.require_admin),
    ):
        validated = cast(
            AdminPolicyUpdatePayload,
            admin_policy_update_request_model.model_validate(payload),
        )
        current_user = cast(dict[str, object], current_user)
        if validated.auto_hide_report_threshold < 1:
            raise HTTPException(status_code=400, detail="임계치는 1 이상이어야 합니다")

        cleaned_keywords = main_module.normalize_keyword_list(
            validated.blocked_keywords
        )
        effective_keywords = main_module.get_effective_blocked_keywords(
            cleaned_keywords
        )
        current_settings = main_module.get_effective_moderation_settings()
        general_settings = main_module.resolve_general_moderation_update(
            main_module,
            validated.model_dump(exclude_none=True),
            current_settings,
        )
        curated_settings = main_module.resolve_curated_moderation_settings(
            main_module,
            validated.model_dump(exclude_none=True),
            current_settings,
        )

        updated = main_module.update_moderation_settings(
            blocked_keywords=effective_keywords,
            auto_hide_report_threshold=validated.auto_hide_report_threshold,
            home_filter_tabs=general_settings["home_filter_tabs"],
            explore_filter_tabs=general_settings["explore_filter_tabs"],
            admin_log_retention_days=general_settings["admin_log_retention_days"],
            admin_log_view_window_days=general_settings["admin_log_view_window_days"],
            admin_log_mask_reasons=general_settings["admin_log_mask_reasons"],
            page_editor_enabled=general_settings["page_editor_enabled"],
            page_editor_rollout_stage=general_settings["page_editor_rollout_stage"],
            page_editor_pilot_admin_ids=general_settings["page_editor_pilot_admin_ids"],
            page_editor_publish_fail_rate_threshold=general_settings[
                "page_editor_publish_fail_rate_threshold"
            ],
            page_editor_rollback_ratio_threshold=general_settings[
                "page_editor_rollback_ratio_threshold"
            ],
            page_editor_conflict_rate_threshold=general_settings[
                "page_editor_conflict_rate_threshold"
            ],
            curated_review_quality_threshold=curated_settings[
                "curated_review_quality_threshold"
            ],
            curated_related_click_boost_min_relevance=curated_settings[
                "curated_related_click_boost_min_relevance"
            ],
            curated_related_click_boost_multiplier=curated_settings[
                "curated_related_click_boost_multiplier"
            ],
            curated_related_click_boost_cap=curated_settings[
                "curated_related_click_boost_cap"
            ],
        )
        if not updated:
            raise HTTPException(status_code=500, detail="정책 저장에 실패했습니다")

        policy_log_metadata = main_module.build_policy_update_log_metadata(
            previous_settings=current_settings,
            next_settings=updated,
        )
        threshold_change = cast(
            dict[str, object],
            policy_log_metadata["curated_quality_threshold"],
        )
        previous_threshold = threshold_change.get("previous")
        next_threshold = threshold_change.get("next")

        main_module.write_admin_action_log(
            admin_id=str(current_user["id"]),
            action_type="policy_updated",
            target_type="moderation_settings",
            target_id="00000000-0000-0000-0000-000000000001",
            reason=(
                f"curated_quality_threshold={next_threshold}, "
                f"curated_quality_threshold_previous={previous_threshold}, "
                f"keywords={len(effective_keywords)}, "
                f"threshold={validated.auto_hide_report_threshold}, "
                f"retention_days={general_settings['admin_log_retention_days']}, "
                f"view_window_days={general_settings['admin_log_view_window_days']}, "
                f"mask_reasons={general_settings['admin_log_mask_reasons']}, "
                f"page_editor_enabled={general_settings['page_editor_enabled']}, "
                f"rollout_stage={general_settings['page_editor_rollout_stage']}, "
                f"pilot_admin_count={len(cast(list[str], general_settings['page_editor_pilot_admin_ids']))}, "
                f"curated_quality_threshold_next={curated_settings['curated_review_quality_threshold']}, "
                f"click_boost_min_relevance={curated_settings['curated_related_click_boost_min_relevance']}, "
                f"click_boost_multiplier={curated_settings['curated_related_click_boost_multiplier']}, "
                f"click_boost_cap={curated_settings['curated_related_click_boost_cap']}"
            ),
            metadata=policy_log_metadata,
        )

        return main_module.get_effective_moderation_settings()
