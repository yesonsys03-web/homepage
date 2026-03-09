from __future__ import annotations

from types import ModuleType
from typing import Mapping

from fastapi import HTTPException

MODERATION_CORE_SETTING_KEYS = (
    "home_filter_tabs",
    "explore_filter_tabs",
    "admin_log_retention_days",
    "admin_log_view_window_days",
    "admin_log_mask_reasons",
    "page_editor_enabled",
    "page_editor_rollout_stage",
    "page_editor_pilot_admin_ids",
    "page_editor_publish_fail_rate_threshold",
    "page_editor_rollback_ratio_threshold",
    "page_editor_conflict_rate_threshold",
)


def normalize_general_moderation_settings(
    main_module: ModuleType,
    settings: Mapping[str, object],
) -> dict[str, object]:
    home_filter_tabs = main_module.normalize_filter_tabs(
        settings.get("home_filter_tabs"),
        main_module.DEFAULT_HOME_FILTER_TABS,
    )
    explore_filter_tabs = main_module.normalize_filter_tabs(
        settings.get("explore_filter_tabs"),
        main_module.DEFAULT_EXPLORE_FILTER_TABS,
    )
    admin_log_retention_days = main_module.normalize_positive_int(
        settings.get("admin_log_retention_days"),
        main_module.DEFAULT_ADMIN_LOG_RETENTION_DAYS,
        minimum=30,
        maximum=3650,
    )
    admin_log_view_window_days = main_module.normalize_positive_int(
        settings.get("admin_log_view_window_days"),
        main_module.DEFAULT_ADMIN_LOG_VIEW_WINDOW_DAYS,
        minimum=1,
        maximum=365,
    )
    admin_log_mask_reasons = bool(settings.get("admin_log_mask_reasons", True))
    page_editor_enabled = bool(settings.get("page_editor_enabled", True))
    page_editor_rollout_stage = main_module.normalize_rollout_stage(
        settings.get("page_editor_rollout_stage"),
        main_module.DEFAULT_PAGE_EDITOR_ROLLOUT_STAGE,
    )
    raw_pilot_ids = settings.get("page_editor_pilot_admin_ids")
    page_editor_pilot_admin_ids_raw = (
        raw_pilot_ids if isinstance(raw_pilot_ids, list) else []
    )
    page_editor_pilot_admin_ids = sorted(
        {
            str(admin_id).strip()
            for admin_id in page_editor_pilot_admin_ids_raw
            if str(admin_id).strip()
        }
    )
    page_editor_publish_fail_rate_threshold = main_module.normalize_ratio(
        settings.get("page_editor_publish_fail_rate_threshold"),
        main_module.DEFAULT_PAGE_EDITOR_PUBLISH_FAIL_RATE_THRESHOLD,
    )
    page_editor_rollback_ratio_threshold = main_module.normalize_ratio(
        settings.get("page_editor_rollback_ratio_threshold"),
        main_module.DEFAULT_PAGE_EDITOR_ROLLBACK_RATIO_THRESHOLD,
    )
    page_editor_conflict_rate_threshold = main_module.normalize_ratio(
        settings.get("page_editor_conflict_rate_threshold"),
        main_module.DEFAULT_PAGE_EDITOR_CONFLICT_RATE_THRESHOLD,
    )
    return {
        "home_filter_tabs": home_filter_tabs,
        "explore_filter_tabs": explore_filter_tabs,
        "admin_log_retention_days": admin_log_retention_days,
        "admin_log_view_window_days": admin_log_view_window_days,
        "admin_log_mask_reasons": admin_log_mask_reasons,
        "page_editor_enabled": page_editor_enabled,
        "page_editor_rollout_stage": page_editor_rollout_stage,
        "page_editor_pilot_admin_ids": page_editor_pilot_admin_ids,
        "page_editor_publish_fail_rate_threshold": page_editor_publish_fail_rate_threshold,
        "page_editor_rollback_ratio_threshold": page_editor_rollback_ratio_threshold,
        "page_editor_conflict_rate_threshold": page_editor_conflict_rate_threshold,
    }


def general_moderation_settings_changed(
    current_settings: Mapping[str, object],
    normalized_settings: Mapping[str, object],
) -> bool:
    return any(
        current_settings.get(key) != normalized_settings[key]
        for key in MODERATION_CORE_SETTING_KEYS
    )


def resolve_general_moderation_update(
    main_module: ModuleType,
    raw_updates: Mapping[str, object],
    current_settings: Mapping[str, object],
) -> dict[str, object]:
    merged_settings = {
        key: raw_updates.get(key, current_settings.get(key))
        for key in MODERATION_CORE_SETTING_KEYS
    }
    return normalize_general_moderation_settings(main_module, merged_settings)


def get_effective_moderation_settings(main_module: ModuleType) -> dict[str, object]:
    settings = main_module.get_moderation_settings()
    if not settings:
        raise HTTPException(status_code=404, detail="정책 설정을 찾을 수 없습니다")

    effective_keywords = main_module.get_effective_blocked_keywords(
        settings.get("blocked_keywords") or []
    )
    raw_keywords = settings.get("blocked_keywords") or []
    normalized_raw_keywords = main_module.normalize_keyword_list(raw_keywords)
    baseline_keywords = main_module.normalize_keyword_list(
        [
            keyword
            for keywords in main_module.BASELINE_BLOCKED_KEYWORD_CATEGORIES.values()
            for keyword in keywords
        ]
    )
    custom_keywords = [
        keyword
        for keyword in normalized_raw_keywords
        if keyword not in baseline_keywords
    ]
    general_settings = normalize_general_moderation_settings(main_module, settings)
    curated_settings = main_module.normalize_curated_moderation_settings(
        main_module,
        settings,
    )
    baseline_categories = {
        category: main_module.normalize_keyword_list(keywords)
        for category, keywords in main_module.BASELINE_BLOCKED_KEYWORD_CATEGORIES.items()
    }
    latest_policy_action = main_module.get_latest_policy_update_action()

    last_updated_by = None
    last_updated_by_id = None
    last_updated_action_at = None
    if latest_policy_action:
        last_updated_by = latest_policy_action.get("admin_nickname")
        if latest_policy_action.get("admin_id"):
            last_updated_by_id = str(latest_policy_action["admin_id"])
        last_updated_action_at = latest_policy_action.get("created_at")

    return {
        "id": settings["id"],
        "blocked_keywords": effective_keywords,
        "custom_blocked_keywords": custom_keywords,
        "baseline_keyword_categories": baseline_categories,
        "auto_hide_report_threshold": settings["auto_hide_report_threshold"],
        "home_filter_tabs": general_settings["home_filter_tabs"],
        "explore_filter_tabs": general_settings["explore_filter_tabs"],
        "admin_log_retention_days": general_settings["admin_log_retention_days"],
        "admin_log_view_window_days": general_settings["admin_log_view_window_days"],
        "admin_log_mask_reasons": general_settings["admin_log_mask_reasons"],
        "page_editor_enabled": general_settings["page_editor_enabled"],
        "page_editor_rollout_stage": general_settings["page_editor_rollout_stage"],
        "page_editor_pilot_admin_ids": general_settings["page_editor_pilot_admin_ids"],
        "page_editor_publish_fail_rate_threshold": general_settings[
            "page_editor_publish_fail_rate_threshold"
        ],
        "page_editor_rollback_ratio_threshold": general_settings[
            "page_editor_rollback_ratio_threshold"
        ],
        "page_editor_conflict_rate_threshold": general_settings[
            "page_editor_conflict_rate_threshold"
        ],
        "curated_review_quality_threshold": curated_settings[
            "curated_review_quality_threshold"
        ],
        "curated_related_click_boost_min_relevance": curated_settings[
            "curated_related_click_boost_min_relevance"
        ],
        "curated_related_click_boost_multiplier": curated_settings[
            "curated_related_click_boost_multiplier"
        ],
        "curated_related_click_boost_cap": curated_settings[
            "curated_related_click_boost_cap"
        ],
        "updated_at": settings["updated_at"],
        "last_updated_by": last_updated_by,
        "last_updated_by_id": last_updated_by_id,
        "last_updated_action_at": last_updated_action_at,
    }


def ensure_baseline_moderation_settings(main_module: ModuleType) -> None:
    settings = main_module.get_moderation_settings()
    if not settings:
        return

    effective_keywords = main_module.get_effective_blocked_keywords(
        settings.get("blocked_keywords") or []
    )
    general_settings = normalize_general_moderation_settings(main_module, settings)
    curated_settings = main_module.normalize_curated_moderation_settings(
        main_module,
        settings,
    )
    if (
        effective_keywords != (settings.get("blocked_keywords") or [])
        or general_moderation_settings_changed(settings, general_settings)
        or main_module.curated_moderation_settings_changed(settings, curated_settings)
    ):
        main_module.update_moderation_settings(
            blocked_keywords=effective_keywords,
            auto_hide_report_threshold=settings["auto_hide_report_threshold"],
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
