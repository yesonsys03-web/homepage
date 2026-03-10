from __future__ import annotations

import json
import re
import unicodedata
from typing import Mapping, Optional, cast
from urllib.parse import urlparse


def extract_block_core_fields(block: Mapping[str, object]) -> dict[str, object]:
    block_type = str(block.get("type") or "")
    content = cast(Mapping[str, object], block.get("content") or {})
    if block_type == "hero":
        return {
            "headline": str(content.get("headline") or ""),
            "highlight": str(content.get("highlight") or ""),
            "description": str(content.get("description") or ""),
            "contactEmail": str(content.get("contactEmail") or ""),
        }
    if block_type == "rich_text":
        return {"body": str(content.get("body") or "")}
    if block_type == "image":
        return {
            "src": str(content.get("src") or ""),
            "alt": str(content.get("alt") or ""),
            "caption": str(content.get("caption") or ""),
        }
    if block_type == "cta":
        return {
            "label": str(content.get("label") or ""),
            "href": str(content.get("href") or ""),
            "style": str(content.get("style") or ""),
        }
    return {"content": cast(dict[str, object], content)}


def build_page_document_diff(
    from_document: Mapping[str, object],
    to_document: Mapping[str, object],
) -> list[dict[str, object]]:
    changes: list[dict[str, object]] = []
    from_blocks = cast(list[Mapping[str, object]], from_document.get("blocks") or [])
    to_blocks = cast(list[Mapping[str, object]], to_document.get("blocks") or [])
    from_map = {str(block.get("id") or ""): block for block in from_blocks}
    to_map = {str(block.get("id") or ""): block for block in to_blocks}
    from_ids = [str(block.get("id") or "") for block in from_blocks]
    to_ids = [str(block.get("id") or "") for block in to_blocks]

    for block_id in from_ids:
        if block_id and block_id not in to_map:
            changes.append(
                {
                    "kind": "block_removed",
                    "block_id": block_id,
                    "message": f"블록 제거: {block_id}",
                }
            )
    for block_id in to_ids:
        if block_id and block_id not in from_map:
            changes.append(
                {
                    "kind": "block_added",
                    "block_id": block_id,
                    "message": f"블록 추가: {block_id}",
                }
            )

    shared_ids = [
        block_id for block_id in to_ids if block_id in from_map and block_id in to_map
    ]
    for block_id in shared_ids:
        before = from_map[block_id]
        after = to_map[block_id]
        before_order_raw = before.get("order")
        after_order_raw = after.get("order")
        before_order = before_order_raw if isinstance(before_order_raw, int) else 0
        after_order = after_order_raw if isinstance(after_order_raw, int) else 0
        if before_order != after_order:
            changes.append(
                {
                    "kind": "block_reordered",
                    "block_id": block_id,
                    "from": before_order,
                    "to": after_order,
                    "message": f"블록 순서 변경: {block_id} ({before_order} -> {after_order})",
                }
            )

        before_core = extract_block_core_fields(before)
        after_core = extract_block_core_fields(after)
        if before_core != after_core:
            changes.append(
                {
                    "kind": "field_changed",
                    "block_id": block_id,
                    "from": before_core,
                    "to": after_core,
                    "message": f"블록 필드 변경: {block_id}",
                }
            )

    return changes


def is_valid_http_url(value: str) -> bool:
    try:
        parsed = urlparse(value.strip())
    except ValueError:
        return False
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def collect_page_document_issues(
    document: Mapping[str, object],
) -> dict[str, list[dict[str, str]]]:
    blocking: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []

    blocks_raw = document.get("blocks", [])
    blocks = cast(
        list[Mapping[str, object]], blocks_raw if isinstance(blocks_raw, list) else []
    )

    orders: list[int] = []

    for index, block in enumerate(blocks):
        block_type = str(block.get("type") or "")
        visible = bool(block.get("visible", True))
        content = cast(Mapping[str, object], block.get("content") or {})

        order_raw = block.get("order")
        order = order_raw if isinstance(order_raw, int) else None
        if order is None:
            blocking.append(
                {
                    "field": f"blocks[{index}].order",
                    "message": "블록 order는 정수여야 합니다",
                }
            )
        else:
            orders.append(order)

        block_id = str(block.get("id") or "").strip()
        if not block_id:
            blocking.append(
                {
                    "field": f"blocks[{index}].id",
                    "message": "블록 id는 필수입니다",
                }
            )

        if not block_type:
            blocking.append(
                {
                    "field": f"blocks[{index}].type",
                    "message": "블록 type은 필수입니다",
                }
            )

        def _required(field: str, message: str) -> None:
            value = str(content.get(field) or "").strip()
            if not value:
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.{field}",
                        "message": message,
                    }
                )

        if block_type == "hero":
            if visible:
                _required("headline", "Hero headline은 필수입니다")
                _required("description", "Hero description은 필수입니다")
        elif block_type == "rich_text":
            if visible:
                _required("body", "본문 내용은 필수입니다")
        elif block_type == "image":
            src = str(content.get("src") or "").strip()
            if visible and not src:
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.src",
                        "message": "이미지 src는 필수입니다",
                    }
                )
            elif src and not is_valid_http_url(src):
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.src",
                        "message": "이미지 src URL 형식이 올바르지 않습니다",
                    }
                )
            alt = str(content.get("alt") or "").strip()
            if src and not alt:
                warnings.append(
                    {
                        "field": f"blocks[{index}].content.alt",
                        "message": "이미지 alt 텍스트를 입력하는 것을 권장합니다",
                    }
                )
        elif block_type == "cta":
            if visible:
                _required("label", "CTA label은 필수입니다")
                _required("href", "CTA href는 필수입니다")
            href = str(content.get("href") or "").strip()
            if href and not is_valid_http_url(href):
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.href",
                        "message": "CTA href URL 형식이 올바르지 않습니다",
                    }
                )
            label = str(content.get("label") or "").strip().lower()
            if label in {"click here", "more", "learn more", "여기", "자세히"}:
                warnings.append(
                    {
                        "field": f"blocks[{index}].content.label",
                        "message": "CTA 라벨을 더 구체적으로 작성하는 것을 권장합니다",
                    }
                )
        elif block_type == "feature_list":
            items_raw = content.get("items")
            if not isinstance(items_raw, list):
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.items",
                        "message": "FeatureList items는 배열이어야 합니다",
                    }
                )
            elif visible and len(items_raw) == 0:
                warnings.append(
                    {
                        "field": f"blocks[{index}].content.items",
                        "message": "FeatureList 항목이 비어 있습니다",
                    }
                )
        elif block_type == "faq":
            items_raw = content.get("items")
            if not isinstance(items_raw, list):
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.items",
                        "message": "FAQ items는 배열이어야 합니다",
                    }
                )
            elif visible and len(items_raw) == 0:
                warnings.append(
                    {
                        "field": f"blocks[{index}].content.items",
                        "message": "FAQ 항목이 비어 있습니다",
                    }
                )
        elif block_type == "gallery":
            items_raw = content.get("items")
            if not isinstance(items_raw, list):
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.items",
                        "message": "Gallery items는 배열이어야 합니다",
                    }
                )
            else:
                for image_index, item_raw in enumerate(items_raw):
                    item = (
                        cast(Mapping[str, object], item_raw)
                        if isinstance(item_raw, Mapping)
                        else {}
                    )
                    src = str(item.get("src") or "").strip()
                    if visible and not src:
                        blocking.append(
                            {
                                "field": f"blocks[{index}].content.items[{image_index}].src",
                                "message": "Gallery image src는 필수입니다",
                            }
                        )
                    elif src and not is_valid_http_url(src):
                        blocking.append(
                            {
                                "field": f"blocks[{index}].content.items[{image_index}].src",
                                "message": "Gallery image src URL 형식이 올바르지 않습니다",
                            }
                        )
                    alt = str(item.get("alt") or "").strip()
                    if src and not alt:
                        warnings.append(
                            {
                                "field": f"blocks[{index}].content.items[{image_index}].alt",
                                "message": "Gallery 이미지 alt 텍스트를 입력하는 것을 권장합니다",
                            }
                        )

    seo_raw = document.get("seo")
    seo = cast(Mapping[str, object], seo_raw if isinstance(seo_raw, Mapping) else {})
    og_image = str(seo.get("ogImage") or "").strip()
    if og_image and not is_valid_http_url(og_image):
        blocking.append(
            {
                "field": "seo.ogImage",
                "message": "OG 이미지 URL 형식이 올바르지 않습니다",
            }
        )

    return {"blocking": blocking, "warnings": warnings}


def normalize_text_for_filter(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text).lower()
    return re.sub(r"[\W_]+", "", normalized)


def normalize_keyword_list(keywords: list[str]) -> list[str]:
    cleaned: list[str] = []
    for keyword in keywords:
        token = normalize_text_for_filter(keyword)
        if token and token not in cleaned:
            cleaned.append(token)
    return cleaned


def get_effective_blocked_keywords(
    custom_keywords: list[str],
    baseline_categories: Mapping[str, list[str]],
) -> list[str]:
    baseline = [
        keyword for keywords in baseline_categories.values() for keyword in keywords
    ]
    combined = list(custom_keywords) + baseline
    return normalize_keyword_list(combined)


def text_contains_blocked_keyword(text: str, blocked_keywords: list[str]) -> bool:
    normalized_text = normalize_text_for_filter(text)
    if not normalized_text:
        return False
    return any(keyword in normalized_text for keyword in blocked_keywords)


def safe_int(value: object, default: int = 0) -> int:
    if isinstance(value, bool):
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        try:
            return int(value)
        except ValueError:
            return default
    return default


def normalize_filter_tabs(
    tabs: object,
    fallback: list[dict[str, str]],
) -> list[dict[str, str]]:
    if not isinstance(tabs, list):
        return [dict(item) for item in fallback]
    cleaned: list[dict[str, str]] = []
    seen_ids: set[str] = set()
    for item in tabs:
        if not isinstance(item, Mapping):
            continue
        raw_id = item.get("id")
        raw_label = item.get("label")
        if not isinstance(raw_id, str) or not isinstance(raw_label, str):
            continue
        tab_id = raw_id.strip()
        label = raw_label.strip()
        if not tab_id or not label:
            continue
        dedupe_key = tab_id.lower()
        if dedupe_key in seen_ids:
            continue
        seen_ids.add(dedupe_key)
        cleaned.append({"id": tab_id, "label": label})
    if not cleaned:
        return [dict(item) for item in fallback]
    return cleaned


def normalize_positive_int(
    value: object, fallback: int, minimum: int, maximum: int
) -> int:
    if not isinstance(value, int):
        return fallback
    if value < minimum:
        return minimum
    if value > maximum:
        return maximum
    return value


def normalize_ratio(value: object, fallback: float) -> float:
    if isinstance(value, bool):
        return fallback
    if not isinstance(value, (int, float, str)):
        return fallback
    try:
        number = float(value)
    except ValueError:
        return fallback
    if number < 0:
        return 0.0
    if number > 1:
        return 1.0
    return number


def normalize_rollout_stage(value: object, fallback: str = "qa") -> str:
    stage = str(value or "").strip().lower()
    if stage in {"qa", "pilot", "open"}:
        return stage
    return fallback


def to_json_compatible(value: object) -> object:
    return json.loads(json.dumps(value, default=str))


def coerce_policy_metadata_value(value: object) -> object:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, list):
        return [coerce_policy_metadata_value(item) for item in value]
    if isinstance(value, tuple):
        return [coerce_policy_metadata_value(item) for item in value]
    if isinstance(value, Mapping):
        return {
            str(key): coerce_policy_metadata_value(item) for key, item in value.items()
        }
    return str(value)


def build_policy_update_log_metadata(
    *,
    previous_settings: Mapping[str, object],
    next_settings: Mapping[str, object],
) -> dict[str, object]:
    tracked_keys = [
        "blocked_keywords",
        "auto_hide_report_threshold",
        "admin_log_retention_days",
        "admin_log_view_window_days",
        "admin_log_mask_reasons",
        "page_editor_enabled",
        "page_editor_rollout_stage",
        "page_editor_pilot_admin_ids",
        "page_editor_publish_fail_rate_threshold",
        "page_editor_rollback_ratio_threshold",
        "page_editor_conflict_rate_threshold",
        "curated_review_quality_threshold",
        "curated_related_click_boost_min_relevance",
        "curated_related_click_boost_multiplier",
        "curated_related_click_boost_cap",
    ]
    changed_fields: dict[str, dict[str, object]] = {}
    for key in tracked_keys:
        previous_value = coerce_policy_metadata_value(previous_settings.get(key))
        next_value = coerce_policy_metadata_value(next_settings.get(key))
        if previous_value != next_value:
            changed_fields[key] = {"previous": previous_value, "next": next_value}
    return {
        "event": "policy_update",
        "changed_fields": changed_fields,
        "curated_quality_threshold": {
            "previous": coerce_policy_metadata_value(
                previous_settings.get("curated_review_quality_threshold")
            ),
            "next": coerce_policy_metadata_value(
                next_settings.get("curated_review_quality_threshold")
            ),
        },
    }
