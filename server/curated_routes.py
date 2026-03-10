from __future__ import annotations

import math
from types import ModuleType
from datetime import datetime, timezone
from typing import Mapping, Optional, Protocol, cast

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel


class CuratedRelatedClickPayload(Protocol):
    source_content_id: object
    target_content_id: object
    reason_code: object | None
    reason: object | None


class CuratedAdminUpdatePayload(Protocol):
    def model_dump(self, *, exclude_none: bool = False) -> dict[str, object]: ...


def serialize_curated_content(
    main_module: ModuleType,
    row: Mapping[str, object],
) -> dict[str, object]:
    raw_review_metadata = row.get("review_metadata")
    review_metadata = (
        cast(dict[str, object], raw_review_metadata)
        if isinstance(raw_review_metadata, dict)
        else {}
    )
    return {
        "id": main_module.safe_int(row.get("id"), 0),
        "source_type": str(row.get("source_type") or "github"),
        "source_url": str(row.get("source_url") or ""),
        "canonical_url": str(row.get("canonical_url") or ""),
        "repo_name": str(row.get("repo_name") or ""),
        "repo_owner": str(row.get("repo_owner") or ""),
        "title": str(row.get("title") or ""),
        "category": str(row.get("category") or ""),
        "language": str(row.get("language") or ""),
        "is_korean_dev": bool(row.get("is_korean_dev") or False),
        "stars": main_module.safe_int(row.get("stars"), 0),
        "license": str(row.get("license") or ""),
        "license_explanation": str(row.get("license_explanation") or ""),
        "thumbnail_url": str(row.get("thumbnail_url") or ""),
        "relevance_score": row.get("relevance_score"),
        "beginner_value": row.get("beginner_value"),
        "quality_score": row.get("quality_score"),
        "summary_beginner": str(row.get("summary_beginner") or ""),
        "summary_mid": str(row.get("summary_mid") or ""),
        "summary_expert": str(row.get("summary_expert") or ""),
        "tags": cast(list[str], row.get("tags") or []),
        "status": str(row.get("status") or "pending"),
        "reject_reason": str(row.get("reject_reason") or ""),
        "review_metadata": review_metadata,
        "approved_at": str(row.get("approved_at") or ""),
        "approved_by": str(row.get("approved_by") or ""),
        "github_pushed_at": str(row.get("github_pushed_at") or ""),
        "collected_at": str(row.get("collected_at") or ""),
        "updated_at": str(row.get("updated_at") or ""),
    }


def _parse_curated_timestamp_ms(value: object) -> Optional[int]:
    if isinstance(value, datetime):
        timestamp = value
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        return int(timestamp.timestamp() * 1000)
    if isinstance(value, str):
        normalized = value.strip()
        if not normalized:
            return None
        candidate = normalized.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(candidate)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return int(parsed.timestamp() * 1000)
    return None


def _curated_freshness_score(item: Mapping[str, object], now_ms: int) -> float:
    source_ms = _parse_curated_timestamp_ms(item.get("github_pushed_at"))
    if source_ms is None:
        source_ms = _parse_curated_timestamp_ms(item.get("collected_at"))
    if source_ms is None:
        return 0.0

    day_ms = 24 * 60 * 60 * 1000
    elapsed_days = max(0.0, (now_ms - source_ms) / day_ms)
    return max(0.0, 30.0 - elapsed_days)


def _normalized_curated_tags(item: Mapping[str, object]) -> list[str]:
    raw_tags = item.get("tags")
    if not isinstance(raw_tags, list):
        return []

    tags: list[str] = []
    for tag in raw_tags:
        if isinstance(tag, str):
            normalized = tag.strip().lower()
            if normalized:
                tags.append(normalized)
    return tags


def _build_curated_related_entry(
    main_module: ModuleType,
    base_item: Mapping[str, object],
    candidate: Mapping[str, object],
    now_ms: int,
    recent_click_count: int = 0,
    click_boost_min_relevance: int = 0,
    click_boost_multiplier: int = 0,
    click_boost_cap: int = 0,
) -> tuple[int, dict[str, object]]:
    current_tag_set = set(_normalized_curated_tags(base_item))
    candidate_tag_set = set(_normalized_curated_tags(candidate))
    overlap_count = len(current_tag_set & candidate_tag_set)
    quality = main_module.safe_int(candidate.get("quality_score"), 0)
    relevance = main_module.safe_int(candidate.get("relevance_score"), 0)
    freshness = _curated_freshness_score(candidate, now_ms)
    base_category = str(base_item.get("category") or "").strip().lower()
    candidate_category = str(candidate.get("category") or "").strip().lower()
    category_match = 1 if base_category and base_category == candidate_category else 0
    base_language = str(base_item.get("language") or "").strip()
    candidate_language = str(candidate.get("language") or "").strip()
    language_match = 1 if base_language and base_language == candidate_language else 0
    korean_match = (
        1
        if bool(base_item.get("is_korean_dev")) and bool(candidate.get("is_korean_dev"))
        else 0
    )
    click_boost_eligible = (
        relevance >= click_boost_min_relevance
        or overlap_count >= main_module.CURATED_RELATED_CLICK_BOOST_MIN_TAG_OVERLAP
    )

    reason_codes: list[str] = []
    if overlap_count > 0:
        reason_codes.append(main_module.CURATED_REASON_TAG_OVERLAP)
    if freshness >= 20:
        reason_codes.append(main_module.CURATED_REASON_RECENT_UPDATE)
    if quality >= 8:
        reason_codes.append(main_module.CURATED_REASON_HIGH_QUALITY)
    if language_match > 0:
        reason_codes.append(main_module.CURATED_REASON_LANGUAGE_MATCH)
    if korean_match > 0:
        reason_codes.append(main_module.CURATED_REASON_KOREAN_DEV_MATCH)
    if not reason_codes:
        reason_codes.append(
            main_module.CURATED_REASON_CATEGORY_MATCH
            if category_match > 0
            else main_module.CURATED_REASON_CONTEXTUAL_MATCH
        )

    score = int(
        overlap_count * 120
        + quality * 9
        + relevance * 8
        + freshness * 2
        + language_match * 12
        + korean_match * 8
    )
    if recent_click_count > 0 and click_boost_eligible:
        score += min(
            click_boost_cap,
            int(math.log1p(recent_click_count) * click_boost_multiplier),
        )
    return score, {
        "item": serialize_curated_content(main_module, candidate),
        "reasons": [
            {
                "code": code,
                "label": main_module.format_curated_reason_label(
                    code,
                    overlap_count=overlap_count,
                    language=base_language if language_match > 0 else None,
                ),
            }
            for code in reason_codes
        ],
    }


def _collect_curated_related_candidates(
    main_module: ModuleType,
    base_item: Mapping[str, object],
    limit: int,
) -> list[dict[str, object]]:
    safe_limit = max(1, min(limit, 8))
    sample_limit = max(24, safe_limit * 8)
    category = str(base_item.get("category") or "").strip() or None

    candidate_rows: list[Mapping[str, object]] = []
    if category:
        candidate_rows.extend(
            cast(
                list[Mapping[str, object]],
                main_module.list_curated_content(
                    status="approved",
                    category=category,
                    sort="latest",
                    limit=sample_limit,
                    offset=0,
                ),
            )
        )

    if len(candidate_rows) < sample_limit:
        candidate_rows.extend(
            cast(
                list[Mapping[str, object]],
                main_module.list_curated_content(
                    status="approved",
                    sort="latest",
                    limit=sample_limit,
                    offset=0,
                ),
            )
        )

    base_id = main_module.safe_int(base_item.get("id"), 0)
    moderation_settings = main_module.get_curated_runtime_settings()
    click_boost_min_relevance = main_module.normalize_positive_int(
        moderation_settings.get("curated_related_click_boost_min_relevance"),
        main_module.DEFAULT_CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE,
        minimum=1,
        maximum=100,
    )
    click_boost_multiplier = main_module.normalize_positive_int(
        moderation_settings.get("curated_related_click_boost_multiplier"),
        main_module.DEFAULT_CURATED_RELATED_CLICK_BOOST_MULTIPLIER,
        minimum=1,
        maximum=200,
    )
    click_boost_cap = main_module.normalize_positive_int(
        moderation_settings.get("curated_related_click_boost_cap"),
        main_module.DEFAULT_CURATED_RELATED_CLICK_BOOST_CAP,
        minimum=1,
        maximum=500,
    )
    seen_ids: set[int] = set()
    scored: list[tuple[int, dict[str, object]]] = []
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    try:
        click_counts = main_module.get_curated_related_click_counts_for_source(
            base_id,
            main_module.CURATED_RELATED_CLICK_BOOST_WINDOW_DAYS,
        )
    except Exception as exc:
        now_monotonic = main_module.time.monotonic()
        if (
            now_monotonic
            - main_module.get_last_curated_related_click_fallback_warning_at()
            >= main_module.CURATED_RELATED_CLICK_FALLBACK_LOG_WINDOW_SECONDS
        ):
            main_module.logger.warning(
                "curated related click-count fallback used: source_id=%s window_days=%s error=%s",
                base_id,
                main_module.CURATED_RELATED_CLICK_BOOST_WINDOW_DAYS,
                exc,
            )
            main_module.set_last_curated_related_click_fallback_warning_at(
                now_monotonic
            )
        click_counts = {}

    for candidate in candidate_rows:
        candidate_id = main_module.safe_int(candidate.get("id"), 0)
        if candidate_id <= 0 or candidate_id == base_id or candidate_id in seen_ids:
            continue
        seen_ids.add(candidate_id)
        scored.append(
            _build_curated_related_entry(
                main_module,
                base_item,
                candidate,
                now_ms,
                recent_click_count=click_counts.get(candidate_id, 0),
                click_boost_min_relevance=click_boost_min_relevance,
                click_boost_multiplier=click_boost_multiplier,
                click_boost_cap=click_boost_cap,
            )
        )

    scored.sort(
        key=lambda entry: (
            entry[0],
            main_module.safe_int(
                cast(dict[str, object], entry[1]["item"]).get("quality_score"),
                0,
            ),
            main_module.safe_int(
                cast(dict[str, object], entry[1]["item"]).get("relevance_score"),
                0,
            ),
            main_module.safe_int(
                cast(dict[str, object], entry[1]["item"]).get("stars"),
                0,
            ),
        ),
        reverse=True,
    )
    return [entry[1] for entry in scored[:safe_limit]]


def _bind_curated_helpers(main_module: ModuleType) -> None:
    setattr(
        main_module,
        "serialize_curated_content",
        lambda row: serialize_curated_content(main_module, row),
    )
    setattr(
        main_module,
        "_collect_curated_related_candidates",
        lambda base_item, limit: _collect_curated_related_candidates(
            main_module,
            base_item,
            limit,
        ),
    )


def register_curated_routes(
    app: FastAPI,
    main_module: ModuleType,
    curated_admin_update_request_model: type[BaseModel],
    curated_related_click_create_model: type[BaseModel],
) -> None:
    _bind_curated_helpers(main_module)

    @app.get("/api/curated")
    def list_curated_endpoint(
        category: Optional[str] = None,
        search: Optional[str] = None,
        is_korean_dev: Optional[bool] = None,
        sort: str = "latest",
        limit: int = 20,
        offset: int = 0,
    ):
        curated_items = main_module.list_curated_content(
            status="approved",
            category=category,
            search=search,
            is_korean_dev=is_korean_dev,
            sort=sort,
            limit=limit,
            offset=offset,
        )
        total = main_module.get_curated_content_count(
            status="approved",
            category=category,
            search=search,
            is_korean_dev=is_korean_dev,
        )
        return {
            "items": [
                main_module.serialize_curated_content(item) for item in curated_items
            ],
            "total": total,
            "next_cursor": None,
        }

    @app.get("/api/curated/{content_id}")
    def get_curated_detail_endpoint(content_id: int):
        item = main_module.get_curated_content_by_id(content_id)
        if not item or str(item.get("status") or "") != "approved":
            raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다")
        return main_module.serialize_curated_content(item)

    @app.get("/api/curated/{content_id}/related")
    def get_curated_related_endpoint(content_id: int, limit: int = 4):
        item = main_module.get_curated_content_by_id(content_id)
        if not item or str(item.get("status") or "") != "approved":
            raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다")

        return {
            "items": main_module._collect_curated_related_candidates(item, limit),
            "source": "server",
        }

    @app.post("/api/curated/related-clicks")
    def create_curated_related_click_endpoint(
        payload: dict[str, object],
        request: Request,
    ):
        validated = cast(
            CuratedRelatedClickPayload,
            curated_related_click_create_model.model_validate(payload),
        )
        source_id = main_module.safe_int(validated.source_content_id, 0)
        target_id = main_module.safe_int(validated.target_content_id, 0)

        if source_id <= 0 or target_id <= 0:
            raise HTTPException(status_code=400, detail="유효하지 않은 콘텐츠 ID입니다")
        if source_id == target_id:
            raise HTTPException(
                status_code=400, detail="동일 콘텐츠 클릭은 기록할 수 없습니다"
            )

        client_ip = main_module._extract_client_ip(request)
        main_module.enforce_rate_limit(
            "curated_related_click_ip",
            client_ip,
            limit=main_module.CURATED_RELATED_CLICK_IP_LIMIT_PER_MINUTE,
            window_seconds=60.0,
            detail="요청이 너무 많습니다. 잠시 후 다시 시도해 주세요",
        )
        dedupe_key = f"{client_ip}:{source_id}:{target_id}"
        try:
            main_module.enforce_rate_limit(
                "curated_related_click_pair",
                dedupe_key,
                limit=1,
                window_seconds=main_module.CURATED_RELATED_CLICK_DEDUPE_WINDOW_SECONDS,
                detail="duplicate curated related click",
            )
        except HTTPException as exc:
            if exc.status_code == 429:
                return {"ok": True, "id": 0}
            raise

        source_item = main_module.get_curated_content_by_id(source_id)
        target_item = main_module.get_curated_content_by_id(target_id)
        if not source_item or str(source_item.get("status") or "") != "approved":
            raise HTTPException(
                status_code=404, detail="기준 콘텐츠를 찾을 수 없습니다"
            )
        if not target_item or str(target_item.get("status") or "") != "approved":
            raise HTTPException(
                status_code=404, detail="대상 콘텐츠를 찾을 수 없습니다"
            )

        normalized_reason_code = main_module.normalize_curated_reason_code(
            validated.reason_code or validated.reason
        )
        if normalized_reason_code == main_module.CURATED_REASON_UNKNOWN and (
            validated.reason or validated.reason_code
        ):
            normalized_reason_code = main_module.CURATED_REASON_CONTEXTUAL_MATCH

        saved = main_module.create_curated_related_click(
            source_content_id=source_id,
            target_content_id=target_id,
            reason_code=normalized_reason_code,
            reason=main_module.get_curated_reason_label(normalized_reason_code),
            client_ip=client_ip,
        )
        saved_id = main_module.safe_int(saved.get("id") if saved else None, 0)
        if saved_id <= 0:
            raise HTTPException(
                status_code=500, detail="추천 클릭 기록 저장에 실패했습니다"
            )
        return {
            "ok": True,
            "id": saved_id,
        }

    @app.get("/api/admin/curated")
    def list_admin_curated_endpoint(
        request: Request,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ):
        _ = main_module.require_admin_from_request(request)
        items = main_module.list_admin_curated_content(
            status=status,
            limit=limit,
            offset=offset,
        )
        total = main_module.get_admin_curated_content_count(status=status)
        return {
            "items": [main_module.serialize_curated_content(item) for item in items],
            "total": total,
            "next_cursor": None,
        }

    @app.patch("/api/admin/curated/{content_id}")
    def update_admin_curated_endpoint(
        content_id: int,
        payload: dict[str, object],
        request: Request,
    ):
        validated = cast(
            CuratedAdminUpdatePayload,
            curated_admin_update_request_model.model_validate(payload),
        )
        current_user = main_module.require_admin_from_request(request)
        updates = validated.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="변경할 필드가 없습니다")

        if updates.get("status") == "approved":
            updates["approved_by"] = current_user["id"]
            if "reject_reason" not in updates:
                updates["reject_reason"] = None

        updated = main_module.update_curated_content_admin(content_id, updates)
        if not updated:
            raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다")
        return main_module.serialize_curated_content(updated)

    @app.post("/api/admin/curated/run")
    def run_curated_collection_endpoint(request: Request):
        _ = main_module.require_admin_from_request(request)
        return main_module.perform_curated_collection_run(allow_sample_fallback=True)

    @app.get("/api/admin/curated/related-clicks/summary")
    def get_admin_curated_related_clicks_summary_endpoint(
        request: Request,
        days: int = 30,
        limit: int = 5,
        source_content_id: Optional[int] = None,
    ):
        _ = main_module.require_admin_from_request(request)
        return main_module.get_curated_related_click_summary(
            days=days,
            limit=limit,
            source_content_id=source_content_id,
        )

    @app.delete("/api/admin/curated/{content_id}")
    def delete_admin_curated_endpoint(
        content_id: int,
        request: Request,
    ):
        _ = main_module.require_admin_from_request(request)
        deleted = main_module.delete_curated_content(content_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다")
        return {"deleted": True, "id": content_id}
