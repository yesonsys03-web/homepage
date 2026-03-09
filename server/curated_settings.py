from __future__ import annotations

from types import ModuleType
from typing import Mapping, cast

CURATED_MODERATION_SETTING_KEYS = (
    "curated_review_quality_threshold",
    "curated_related_click_boost_min_relevance",
    "curated_related_click_boost_multiplier",
    "curated_related_click_boost_cap",
)


def normalize_curated_moderation_settings(
    main_module: ModuleType,
    settings: Mapping[str, object] | None,
) -> dict[str, int]:
    normalized_settings = dict(settings or {})
    return {
        "curated_review_quality_threshold": main_module.normalize_positive_int(
            normalized_settings.get("curated_review_quality_threshold"),
            main_module.DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD,
            minimum=1,
            maximum=100,
        ),
        "curated_related_click_boost_min_relevance": main_module.normalize_positive_int(
            normalized_settings.get("curated_related_click_boost_min_relevance"),
            main_module.DEFAULT_CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE,
            minimum=1,
            maximum=100,
        ),
        "curated_related_click_boost_multiplier": main_module.normalize_positive_int(
            normalized_settings.get("curated_related_click_boost_multiplier"),
            main_module.DEFAULT_CURATED_RELATED_CLICK_BOOST_MULTIPLIER,
            minimum=1,
            maximum=200,
        ),
        "curated_related_click_boost_cap": main_module.normalize_positive_int(
            normalized_settings.get("curated_related_click_boost_cap"),
            main_module.DEFAULT_CURATED_RELATED_CLICK_BOOST_CAP,
            minimum=1,
            maximum=500,
        ),
    }


def curated_moderation_settings_changed(
    current_settings: Mapping[str, object],
    normalized_curated_settings: Mapping[str, int],
) -> bool:
    return any(
        current_settings.get(key) != normalized_curated_settings[key]
        for key in CURATED_MODERATION_SETTING_KEYS
    )


def resolve_curated_moderation_settings(
    main_module: ModuleType,
    raw_updates: Mapping[str, object],
    fallback_settings: Mapping[str, object],
) -> dict[str, int]:
    merged_settings = {
        key: raw_updates.get(key, fallback_settings.get(key))
        for key in CURATED_MODERATION_SETTING_KEYS
    }
    return normalize_curated_moderation_settings(main_module, merged_settings)


def get_curated_runtime_settings(main_module: ModuleType) -> dict[str, int]:
    raw_settings: object | None = None
    try:
        raw_settings = main_module.get_moderation_settings()
    except Exception:
        raw_settings = None

    settings = (
        cast(dict[str, object], raw_settings) if isinstance(raw_settings, dict) else {}
    )
    return normalize_curated_moderation_settings(main_module, settings)
