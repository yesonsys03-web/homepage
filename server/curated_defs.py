from __future__ import annotations

import os
from typing import Literal, Optional, TypedDict

from pydantic import BaseModel

CURATED_STATUS_PENDING = "pending"
CURATED_STATUS_REVIEW_LICENSE = "review_license"
CURATED_STATUS_REVIEW_DUPLICATE = "review_duplicate"
CURATED_STATUS_REVIEW_QUALITY = "review_quality"
CURATED_STATUS_APPROVED = "approved"
CURATED_STATUS_REJECTED = "rejected"
CURATED_STATUS_AUTO_REJECTED = "auto_rejected"

CURATED_REVIEW_QUEUE_STATUSES = {
    CURATED_STATUS_PENDING,
    CURATED_STATUS_REVIEW_LICENSE,
    CURATED_STATUS_REVIEW_DUPLICATE,
    CURATED_STATUS_REVIEW_QUALITY,
}

CURATED_RELATED_CLICK_BOOST_WINDOW_DAYS = 30
CURATED_RELATED_CLICK_BOOST_CAP = 180
CURATED_RELATED_CLICK_BOOST_MULTIPLIER = 48
CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE = 6
CURATED_RELATED_CLICK_BOOST_MIN_TAG_OVERLAP = 1
CURATED_RELATED_CLICK_IP_LIMIT_PER_MINUTE = 24
CURATED_RELATED_CLICK_DEDUPE_WINDOW_SECONDS = 30.0
CURATED_RELATED_CLICK_FALLBACK_LOG_WINDOW_SECONDS = 60.0

DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD = 45
DEFAULT_CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE = 6
DEFAULT_CURATED_RELATED_CLICK_BOOST_MULTIPLIER = 48
DEFAULT_CURATED_RELATED_CLICK_BOOST_CAP = 180

AUTO_CURATED_COLLECTION_MIN_INTERVAL_SECONDS = 60
AUTO_CURATED_COLLECTION_ENABLED = (
    os.getenv("AUTO_CURATED_COLLECTION_ENABLED", "false").lower() == "true"
)
AUTO_CURATED_COLLECTION_RUN_ON_STARTUP = (
    os.getenv("AUTO_CURATED_COLLECTION_RUN_ON_STARTUP", "false").lower() == "true"
)
AUTO_CURATED_COLLECTION_INTERVAL_SECONDS = max(
    AUTO_CURATED_COLLECTION_MIN_INTERVAL_SECONDS,
    int(os.getenv("AUTO_CURATED_COLLECTION_INTERVAL_SECONDS", "21600")),
)


class CuratedAdminUpdateRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    summary_beginner: Optional[str] = None
    summary_mid: Optional[str] = None
    summary_expert: Optional[str] = None
    tags: Optional[list[str]] = None
    status: Optional[
        Literal[
            "pending",
            "review_license",
            "review_duplicate",
            "review_quality",
            "approved",
            "rejected",
            "auto_rejected",
        ]
    ] = None
    reject_reason: Optional[str] = None
    quality_score: Optional[int] = None
    relevance_score: Optional[int] = None
    beginner_value: Optional[int] = None
    license: Optional[str] = None
    thumbnail_url: Optional[str] = None


class CuratedDuplicateReviewMetadata(TypedDict, total=False):
    reason_codes: list[str]
    canonical_url_match: bool
    owner_repo_match: bool
    title_match: bool
    matched_existing_ids: list[int]
    matched_processed_titles: list[str]
    license_value: str
    quality_score_value: int
    quality_threshold: int


class CuratedRelatedClickCreate(BaseModel):
    source_content_id: int
    target_content_id: int
    reason_code: Optional[str] = None
    reason: Optional[str] = None


class CuratedReasonPayload(TypedDict):
    code: str
    label: str


class CuratedRelatedListItem(TypedDict):
    item: dict[str, object]
    reasons: list[CuratedReasonPayload]
