from __future__ import annotations

import re


CURATED_REASON_UNKNOWN = "unknown"
CURATED_REASON_TAG_OVERLAP = "tag_overlap"
CURATED_REASON_RECENT_UPDATE = "recent_update"
CURATED_REASON_HIGH_QUALITY = "high_quality"
CURATED_REASON_LANGUAGE_MATCH = "language_match"
CURATED_REASON_KOREAN_DEV_MATCH = "korean_dev_match"
CURATED_REASON_CATEGORY_MATCH = "category_match"
CURATED_REASON_CONTEXTUAL_MATCH = "contextual_match"

CURATED_REASON_LABELS: dict[str, str] = {
    CURATED_REASON_UNKNOWN: "기타",
    CURATED_REASON_TAG_OVERLAP: "태그 일치",
    CURATED_REASON_RECENT_UPDATE: "최근 업데이트",
    CURATED_REASON_HIGH_QUALITY: "품질 점수 높음",
    CURATED_REASON_LANGUAGE_MATCH: "언어 일치",
    CURATED_REASON_KOREAN_DEV_MATCH: "KR Dev 일치",
    CURATED_REASON_CATEGORY_MATCH: "유사 카테고리",
    CURATED_REASON_CONTEXTUAL_MATCH: "추천 맥락 일치",
}

CURATED_REASON_TAG_PATTERN = re.compile(r"^태그\s+\d+개\s+일치$")


def normalize_curated_reason_code(value: object | None) -> str:
    if not isinstance(value, str):
        return CURATED_REASON_UNKNOWN

    candidate = value.strip()
    if not candidate:
        return CURATED_REASON_UNKNOWN
    if candidate in CURATED_REASON_LABELS:
        return candidate
    if (
        CURATED_REASON_TAG_PATTERN.match(candidate)
        or candidate == CURATED_REASON_LABELS[CURATED_REASON_TAG_OVERLAP]
    ):
        return CURATED_REASON_TAG_OVERLAP
    if candidate.endswith("언어 일치"):
        return CURATED_REASON_LANGUAGE_MATCH

    exact_matches = {
        CURATED_REASON_LABELS[
            CURATED_REASON_RECENT_UPDATE
        ]: CURATED_REASON_RECENT_UPDATE,
        CURATED_REASON_LABELS[CURATED_REASON_HIGH_QUALITY]: CURATED_REASON_HIGH_QUALITY,
        CURATED_REASON_LABELS[
            CURATED_REASON_KOREAN_DEV_MATCH
        ]: CURATED_REASON_KOREAN_DEV_MATCH,
        CURATED_REASON_LABELS[
            CURATED_REASON_CATEGORY_MATCH
        ]: CURATED_REASON_CATEGORY_MATCH,
        CURATED_REASON_LABELS[
            CURATED_REASON_CONTEXTUAL_MATCH
        ]: CURATED_REASON_CONTEXTUAL_MATCH,
        "관련 추천 클릭": CURATED_REASON_CONTEXTUAL_MATCH,
        "unknown": CURATED_REASON_UNKNOWN,
    }
    return exact_matches.get(candidate, CURATED_REASON_UNKNOWN)


def get_curated_reason_label(code: object | None) -> str:
    normalized = normalize_curated_reason_code(code)
    return CURATED_REASON_LABELS.get(
        normalized, CURATED_REASON_LABELS[CURATED_REASON_UNKNOWN]
    )


def format_curated_reason_label(
    code: object | None,
    *,
    overlap_count: int = 0,
    language: str | None = None,
) -> str:
    normalized = normalize_curated_reason_code(code)
    if normalized == CURATED_REASON_TAG_OVERLAP and overlap_count > 0:
        return f"태그 {overlap_count}개 일치"
    if normalized == CURATED_REASON_LANGUAGE_MATCH and language:
        return f"{language} 언어 일치"
    return get_curated_reason_label(normalized)
