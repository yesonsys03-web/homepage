# pyright: reportUnknownVariableType=false, reportUnknownArgumentType=false, reportUnknownMemberType=false, reportUnknownParameterType=false, reportUnknownLambdaType=false, reportCallInDefaultInitializer=false, reportDeprecated=false

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import RedirectResponse, Response
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import (
    Awaitable,
    AsyncIterator,
    Callable,
    Literal,
    Optional,
    Mapping,
    Protocol,
    Sequence,
    TypedDict,
    cast,
)
from datetime import datetime, timedelta, timezone
import asyncio
import logging
import math
import re
import unicodedata
import time
import os
import json
import hashlib
import secrets
import uuid
from xml.sax.saxutils import escape as xml_escape
from urllib.parse import urlparse, urlencode, quote
from urllib.request import Request as UrlRequest, urlopen
from urllib.error import HTTPError, URLError
from threading import Lock
from contextlib import asynccontextmanager
from collections import deque

from db import (
    init_db,
    get_projects,
    get_project,
    create_project,
    like_project,
    unlike_project,
    get_comments,
    create_comment,
    report_comment,
    get_reports,
    get_reports_count,
    get_admin_stats,
    update_report,
    create_user,
    create_or_update_google_user,
    get_user_by_email,
    get_user_by_provider,
    get_user_by_nickname,
    get_user_by_id,
    update_user_profile,
    bootstrap_super_admin_user,
    get_user_projects,
    get_user_comments,
    get_user_liked_projects,
    get_admin_projects,
    update_project_admin,
    update_project_owner_fields,
    set_project_status,
    create_admin_action_log,
    get_admin_action_logs,
    get_admin_action_observability,
    cleanup_admin_action_logs,
    get_latest_policy_update_action,
    get_admin_users,
    limit_user,
    unlimit_user,
    suspend_user,
    unsuspend_user,
    revoke_user_tokens,
    schedule_user_deletion,
    cancel_user_deletion,
    delete_user_now,
    purge_due_user_deletions,
    approve_user,
    reject_user,
    set_user_role,
    get_moderation_settings,
    update_moderation_settings,
    get_oauth_runtime_settings,
    update_oauth_runtime_settings,
    create_oauth_state_token,
    consume_oauth_state_token,
    cleanup_oauth_state_tokens,
    get_site_content,
    upsert_site_content,
    list_site_contents_by_prefix,
    get_page_document_draft,
    save_page_document_draft,
    publish_page_document,
    list_page_document_versions,
    get_page_document_version,
    rollback_page_document,
    create_page_publish_schedule,
    list_page_publish_schedules,
    cancel_page_publish_schedule,
    retry_page_publish_schedule,
    list_due_page_publish_schedules,
    mark_page_publish_schedule_published,
    mark_page_publish_schedule_failed,
    list_curated_content,
    get_curated_content_count,
    get_curated_content_by_id,
    list_admin_curated_content,
    get_admin_curated_content_count,
    create_or_update_curated_content,
    update_curated_content_admin,
    delete_curated_content,
    get_error_solution,
    upsert_error_solution,
    get_text_translation,
    upsert_text_translation,
    increment_error_solution_feedback,
    create_glossary_term_request,
    create_curated_related_click,
    get_curated_related_click_counts_for_source,
    get_curated_related_click_summary,
)
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token,
)
from scheduler import cancel_background_task, run_periodic_async_loop
from github_collector import (
    GitHubCollectorConfig,
    build_search_query,
    fetch_github_readme_excerpt,
    fetch_github_license_file,
    normalize_github_repo_url,
    reached_daily_collect_limit,
    search_github_repositories,
)
from gemini_curator import (
    CurationEvaluation,
    QualityInputs,
    ThreeLevelSummary,
    calc_quality_score,
    curate_repository_with_gemini,
    fallback_summary_template,
    heuristic_curation_evaluation,
    summarize_repository_without_llm,
    should_auto_reject,
)

logger = logging.getLogger(__name__)

CURATED_REASON_UNKNOWN = "unknown"
CURATED_REASON_TAG_OVERLAP = "tag_overlap"
CURATED_REASON_RECENT_UPDATE = "recent_update"
CURATED_REASON_HIGH_QUALITY = "high_quality"
CURATED_REASON_LANGUAGE_MATCH = "language_match"
CURATED_REASON_KOREAN_DEV_MATCH = "korean_dev_match"
CURATED_REASON_CATEGORY_MATCH = "category_match"
CURATED_REASON_CONTEXTUAL_MATCH = "contextual_match"

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
CURATED_RELATED_CLICK_BOOST_WINDOW_DAYS = 30
CURATED_RELATED_CLICK_BOOST_CAP = 180
CURATED_RELATED_CLICK_BOOST_MULTIPLIER = 48
CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE = 6
CURATED_RELATED_CLICK_BOOST_MIN_TAG_OVERLAP = 1
CURATED_RELATED_CLICK_IP_LIMIT_PER_MINUTE = 24
CURATED_RELATED_CLICK_DEDUPE_WINDOW_SECONDS = 30.0
CURATED_RELATED_CLICK_FALLBACK_LOG_WINDOW_SECONDS = 60.0
_last_curated_related_click_fallback_warning_at = 0.0


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
    language: Optional[str] = None,
) -> str:
    normalized = normalize_curated_reason_code(code)
    if normalized == CURATED_REASON_TAG_OVERLAP and overlap_count > 0:
        return f"태그 {overlap_count}개 일치"
    if normalized == CURATED_REASON_LANGUAGE_MATCH and language:
        return f"{language} 언어 일치"
    return get_curated_reason_label(normalized)


async def startup_event() -> None:
    await _startup_event_impl()


async def shutdown_event() -> None:
    await _shutdown_event_impl()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    _ = app
    await startup_event()
    try:
        yield
    finally:
        await shutdown_event()


app = FastAPI(title="VibeCoder Playground API", lifespan=lifespan)


@app.middleware("http")
async def enforce_https_and_security_headers(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
):
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip()
    request_scheme = str(request.scope.get("scheme") or "http")
    request_is_https = request_scheme == "https" or forwarded_proto == "https"

    if ENFORCE_HTTPS and not request_is_https:
        host = request.headers.get("host", "localhost")
        secure_url = f"https://{host}{request.url.path}"
        if request.url.query:
            secure_url = f"{secure_url}?{request.url.query}"
        return RedirectResponse(url=secure_url, status_code=307)

    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://localhost:5173 http://127.0.0.1:5173",
    )
    if ENFORCE_HTTPS or request_is_https:
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    return response


PROJECT_LIST_CACHE_TTL_SECONDS = 12.0
PROJECT_PERF_WINDOW_SIZE = 300
PAGE_EDITOR_PERF_WINDOW_SIZE = 500
_project_list_cache: dict[
    tuple[str, Optional[str], Optional[str]], tuple[float, list[dict[str, object]]]
] = {}
_project_list_cache_lock = Lock()
_project_perf_samples: deque[tuple[float, float, int]] = deque(
    maxlen=PROJECT_PERF_WINDOW_SIZE
)
_project_perf_lock = Lock()
_page_editor_perf_samples: deque[tuple[str, float, str]] = deque(
    maxlen=PAGE_EDITOR_PERF_WINDOW_SIZE
)
_page_editor_perf_lock = Lock()


def _project_cache_key(
    sort: str, platform: Optional[str], tag: Optional[str]
) -> tuple[str, Optional[str], Optional[str]]:
    return (sort, platform, tag)


def _get_cached_projects(
    sort: str, platform: Optional[str], tag: Optional[str]
) -> Optional[list[dict[str, object]]]:
    now = time.perf_counter()
    key = _project_cache_key(sort, platform, tag)
    with _project_list_cache_lock:
        cached = _project_list_cache.get(key)
        if not cached:
            return None
        expires_at, items = cached
        if expires_at <= now:
            _ = _project_list_cache.pop(key, None)
            return None
        return [dict(item) for item in items]


def _set_cached_projects(
    sort: str,
    platform: Optional[str],
    tag: Optional[str],
    items: Sequence[Mapping[str, object]],
) -> None:
    key = _project_cache_key(sort, platform, tag)
    expires_at = time.perf_counter() + PROJECT_LIST_CACHE_TTL_SECONDS
    with _project_list_cache_lock:
        _project_list_cache[key] = (expires_at, [dict(item) for item in items])


def _invalidate_projects_cache() -> None:
    with _project_list_cache_lock:
        _project_list_cache.clear()


def _percentile(values: list[float], ratio: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = round((len(ordered) - 1) * ratio)
    index = min(max(index, 0), len(ordered) - 1)
    return ordered[index]


def _record_project_perf(elapsed_ms: float, db_ms: float, cache_hit: bool) -> None:
    with _project_perf_lock:
        _project_perf_samples.append((elapsed_ms, db_ms, 1 if cache_hit else 0))


def _project_perf_snapshot() -> dict[str, object]:
    with _project_perf_lock:
        samples = list(_project_perf_samples)

    if not samples:
        return {
            "window_size": PROJECT_PERF_WINDOW_SIZE,
            "sample_count": 0,
            "cache_hit_rate": 0.0,
            "elapsed_ms_p50": 0.0,
            "elapsed_ms_p95": 0.0,
            "db_ms_p50": 0.0,
            "db_ms_p95": 0.0,
        }

    elapsed_values = [row[0] for row in samples]
    db_values = [row[1] for row in samples if row[2] == 0]
    cache_hit_rate = sum(row[2] for row in samples) / len(samples)

    return {
        "window_size": PROJECT_PERF_WINDOW_SIZE,
        "sample_count": len(samples),
        "cache_hit_rate": round(cache_hit_rate, 4),
        "elapsed_ms_p50": round(_percentile(elapsed_values, 0.5), 2),
        "elapsed_ms_p95": round(_percentile(elapsed_values, 0.95), 2),
        "db_ms_p50": round(_percentile(db_values, 0.5), 2),
        "db_ms_p95": round(_percentile(db_values, 0.95), 2),
    }


PAGE_EDITOR_PERF_SCENARIOS: set[str] = {
    "editor_initial_load",
    "preview_switch",
    "draft_save_roundtrip",
    "panel_canvas_roundtrip_count",
    "edit_completion_time",
    "editor_scroll_distance",
}

PAGE_EDITOR_PERF_SLO_P75_MS: dict[str, float] = {
    "editor_initial_load": 2500.0,
    "draft_save_roundtrip": 800.0,
    "preview_switch": 500.0,
    "panel_canvas_roundtrip_count": 6.0,
    "edit_completion_time": 180000.0,
    "editor_scroll_distance": 6000.0,
}


def _record_page_editor_perf(
    scenario: str,
    duration_ms: float,
    source: Optional[str] = None,
) -> None:
    with _page_editor_perf_lock:
        _page_editor_perf_samples.append((scenario, duration_ms, str(source or "")))


def _parse_perf_source_tags(source: str) -> dict[str, str]:
    tags: dict[str, str] = {}
    for segment in source.split(";"):
        item = segment.strip()
        if not item or "=" not in item:
            continue
        key, value = item.split("=", 1)
        tag_key = key.strip()
        tag_value = value.strip()
        if tag_key and tag_value:
            tags[tag_key] = tag_value
    return tags


def _resolve_editor_ui_variant(source: str) -> str:
    tags = _parse_perf_source_tags(source)
    variant = tags.get("ui_variant", "").strip().lower()
    if variant in {"enhanced", "baseline"}:
        return variant
    return "baseline"


def _page_editor_perf_snapshot() -> dict[str, object]:
    with _page_editor_perf_lock:
        samples = list(_page_editor_perf_samples)

    if not samples:
        return {
            "window_size": PAGE_EDITOR_PERF_WINDOW_SIZE,
            "sample_count": 0,
            "metrics": {
                scenario: {
                    "sample_count": 0,
                    "p75_ms": 0.0,
                    "p95_ms": 0.0,
                    "slo_p75_ms": PAGE_EDITOR_PERF_SLO_P75_MS[scenario],
                    "within_slo": True,
                }
                for scenario in sorted(PAGE_EDITOR_PERF_SCENARIOS)
            },
            "variants": {
                "baseline": {
                    "sample_count": 0,
                    "metrics": {
                        scenario: {
                            "sample_count": 0,
                            "p75_ms": 0.0,
                            "p95_ms": 0.0,
                            "slo_p75_ms": PAGE_EDITOR_PERF_SLO_P75_MS[scenario],
                            "within_slo": True,
                        }
                        for scenario in sorted(PAGE_EDITOR_PERF_SCENARIOS)
                    },
                },
                "enhanced": {
                    "sample_count": 0,
                    "metrics": {
                        scenario: {
                            "sample_count": 0,
                            "p75_ms": 0.0,
                            "p95_ms": 0.0,
                            "slo_p75_ms": PAGE_EDITOR_PERF_SLO_P75_MS[scenario],
                            "within_slo": True,
                        }
                        for scenario in sorted(PAGE_EDITOR_PERF_SCENARIOS)
                    },
                },
            },
        }

    metrics: dict[str, dict[str, object]] = {}
    for scenario in sorted(PAGE_EDITOR_PERF_SCENARIOS):
        durations = [row[1] for row in samples if row[0] == scenario]
        p75_ms = round(_percentile(durations, 0.75), 2)
        p95_ms = round(_percentile(durations, 0.95), 2)
        slo_p75_ms = PAGE_EDITOR_PERF_SLO_P75_MS[scenario]
        metrics[scenario] = {
            "sample_count": len(durations),
            "p75_ms": p75_ms,
            "p95_ms": p95_ms,
            "slo_p75_ms": slo_p75_ms,
            "within_slo": p75_ms <= slo_p75_ms,
        }

    variants: dict[str, dict[str, object]] = {
        "baseline": {"sample_count": 0, "metrics": {}},
        "enhanced": {"sample_count": 0, "metrics": {}},
    }

    for variant in ("baseline", "enhanced"):
        variant_samples = [
            row for row in samples if _resolve_editor_ui_variant(row[2]) == variant
        ]
        variants[variant]["sample_count"] = len(variant_samples)

        variant_metric_map: dict[str, dict[str, object]] = {}
        for scenario in sorted(PAGE_EDITOR_PERF_SCENARIOS):
            durations = [row[1] for row in variant_samples if row[0] == scenario]
            p75_ms = round(_percentile(durations, 0.75), 2)
            p95_ms = round(_percentile(durations, 0.95), 2)
            slo_p75_ms = PAGE_EDITOR_PERF_SLO_P75_MS[scenario]
            variant_metric_map[scenario] = {
                "sample_count": len(durations),
                "p75_ms": p75_ms,
                "p95_ms": p95_ms,
                "slo_p75_ms": slo_p75_ms,
                "within_slo": p75_ms <= slo_p75_ms,
            }
        variants[variant]["metrics"] = variant_metric_map

    return {
        "window_size": PAGE_EDITOR_PERF_WINDOW_SIZE,
        "sample_count": len(samples),
        "metrics": metrics,
        "variants": variants,
    }


BASELINE_BLOCKED_KEYWORD_CATEGORIES: dict[str, list[str]] = {
    "비하/혐오": [
        "성별비하",
        "지역비하",
        "장애비하",
        "인종비하",
        "종교비하",
        "정치비하",
        "혐오",
    ],
    "욕설/변형욕설": [
        "ㅅㅂ",
        "ㄲㅈ",
        "ㅆㄹㄱ",
        "패드립",
    ],
    "범죄/유해정보": [
        "불법토토",
        "도박",
        "환전",
        "마약",
        "필로폰",
        "대마",
        "성매매",
        "계좌대여",
        "작업대출",
        "고수익보장",
        "보이스피싱",
    ],
}

DEFAULT_HOME_FILTER_TABS: list[dict[str, str]] = [
    {"id": "all", "label": "전체"},
    {"id": "web", "label": "Web"},
    {"id": "app", "label": "App"},
    {"id": "ai", "label": "AI"},
    {"id": "tool", "label": "Tool"},
    {"id": "game", "label": "Game"},
    {"id": "和学习", "label": "和学习"},
]

DEFAULT_EXPLORE_FILTER_TABS: list[dict[str, str]] = [
    {"id": "all", "label": "전체"},
    {"id": "web", "label": "Web"},
    {"id": "game", "label": "Game"},
    {"id": "tool", "label": "Tool"},
    {"id": "ai", "label": "AI"},
    {"id": "mobile", "label": "Mobile"},
]

ABOUT_CONTENT_KEY = "about_page"
ABOUT_CONTENT_TARGET_ID = "00000000-0000-0000-0000-000000000003"
ABOUT_CONTENT_DEFAULT = {
    "hero_title": "완성도보다 바이브.",
    "hero_highlight": "실험도 작품이다.",
    "hero_description": "VibeCoder는 개발자들이 자유롭게 실험하고, 공유하고, 피드백을 받는 공간입니다. 완벽한 코드보다 재미있는 시도가 더 가치 있다고 믿습니다.",
    "contact_email": "hello@vibecoder.dev",
    "values": [
        {
            "emoji": "🎨",
            "title": "창작의 자유",
            "description": "완벽함보다 uniqueness를 중요시합니다. 당신만의 독특한 바이브를 보여주세요.",
        },
        {
            "emoji": "🤝",
            "title": "피드백 문화",
            "description": "constructive한 피드백으로 서로 성장합니다. 비난보다 건전한 논의를 추구합니다.",
        },
        {
            "emoji": "🚀",
            "title": "실험정신",
            "description": "실패를 두려워하지 말고 새로운 시도를 마음껏 해보세요.",
        },
    ],
    "team_members": [
        {
            "name": "devkim",
            "role": "Founder & Lead Dev",
            "description": "AI와 웹 개발을 좋아합니다",
        },
        {
            "name": "codemaster",
            "role": "Backend Engineer",
            "description": "Rust와 Python을 좋아합니다",
        },
        {
            "name": "designer_y",
            "role": "UI/UX Designer",
            "description": "사용자 경험을 중요시합니다",
        },
    ],
    "faqs": [
        {
            "question": "VibeCoder는 무엇인가요?",
            "answer": "개발자들이 자신의 프로젝트를 공유하고, 서로의 작품에 대한 피드백을 받을 수 있는 커뮤니티입니다.",
        },
        {
            "question": "프로젝트를 어떻게 올리나요?",
            "answer": "로그인 후 '작품 올리기' 버튼을 클릭하여 프로젝트 정보를 입력하면 됩니다.",
        },
        {
            "question": "챌린지에 참여하려면 어떻게 해야 하나요?",
            "answer": "챌린지 페이지에서 마음에 드는 챌린지를 선택하고 '참가하기' 버튼을 클릭하면 됩니다.",
        },
        {
            "question": "무료로 사용할 수 있나요?",
            "answer": "네, 기본 기능은 모두 무료입니다. 추후 유료 기능이 추가될 예정입니다.",
        },
    ],
}


# CORS 설정
def parse_allowed_origins(raw: str) -> list[str]:
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["http://localhost:5173", "http://127.0.0.1:5173"]


ALLOWED_ORIGINS = parse_allowed_origins(
    os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


# ============ Models ============


class ProjectCreate(BaseModel):
    title: str
    summary: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    demo_url: Optional[str] = None
    repo_url: Optional[str] = None
    platform: str = "web"
    tags: list[str] = []


class ProjectUpdateRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    demo_url: Optional[str] = None
    repo_url: Optional[str] = None
    platform: Optional[str] = None
    tags: Optional[list[str]] = None


class CommentCreate(BaseModel):
    content: str


class ReportCreate(BaseModel):
    target_type: str
    target_id: str
    reason: str
    memo: Optional[str] = None


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


class ErrorTranslateRequest(BaseModel):
    error_message: str


class ErrorTranslateFeedbackRequest(BaseModel):
    error_hash: str
    solved: bool


class TextTranslateRequest(BaseModel):
    input_text: str


class GlossaryTermRequestCreate(BaseModel):
    requested_term: str
    context_note: Optional[str] = None


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


class RegisterRequest(BaseModel):
    email: str
    nickname: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    nickname: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


PROFILE_NICKNAME_MIN_LEN = 2
PROFILE_NICKNAME_MAX_LEN = 24
PROFILE_BIO_MAX_LEN = 300
GOOGLE_OAUTH_STATE_TTL_SECONDS = 600
DEFAULT_ADMIN_LOG_RETENTION_DAYS = 365
DEFAULT_ADMIN_LOG_VIEW_WINDOW_DAYS = 30
DEFAULT_PAGE_EDITOR_ROLLOUT_STAGE = "qa"
DEFAULT_PAGE_EDITOR_PUBLISH_FAIL_RATE_THRESHOLD = 0.2
DEFAULT_PAGE_EDITOR_ROLLBACK_RATIO_THRESHOLD = 0.3
DEFAULT_PAGE_EDITOR_CONFLICT_RATE_THRESHOLD = 0.25
DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD = 45
DEFAULT_CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE = 6
DEFAULT_CURATED_RELATED_CLICK_BOOST_MULTIPLIER = 48
DEFAULT_CURATED_RELATED_CLICK_BOOST_CAP = 180
ADMIN_LOG_CLEANUP_INTERVAL_SECONDS = 6 * 60 * 60
AUTO_CURATED_COLLECTION_MIN_INTERVAL_SECONDS = 60
SYSTEM_ADMIN_USER_ID = "11111111-1111-1111-1111-111111111111"
ADMIN_ALLOWED_ROLES = {"admin", "super_admin"}
SUPER_ADMIN_BOOTSTRAP_EMAIL = "topyeson@gmail.com"
_admin_log_cleanup_task: Optional[asyncio.Task[None]] = None
_curated_collection_task: Optional[asyncio.Task[None]] = None

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback"
)
GOOGLE_FRONTEND_REDIRECT_URI = os.getenv(
    "GOOGLE_FRONTEND_REDIRECT_URI", "http://localhost:5173"
)
ENFORCE_HTTPS = os.getenv("ENFORCE_HTTPS", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")

LOGIN_IP_LIMIT_PER_MINUTE = 10
LOGIN_ACCOUNT_LIMIT_PER_HOUR = 20
REGISTER_IP_LIMIT_PER_HOUR = 5
ERROR_TRANSLATE_IP_LIMIT_PER_MINUTE = int(
    os.getenv("ERROR_TRANSLATE_IP_LIMIT_PER_MINUTE", "20")
)
TEXT_TRANSLATE_IP_LIMIT_PER_MINUTE = int(
    os.getenv("TEXT_TRANSLATE_IP_LIMIT_PER_MINUTE", "20")
)
GLOSSARY_TERM_REQUEST_IP_LIMIT_PER_HOUR = int(
    os.getenv("GLOSSARY_TERM_REQUEST_IP_LIMIT_PER_HOUR", "10")
)
DAILY_COLLECT_LIMIT = int(os.getenv("DAILY_COLLECT_LIMIT", "5"))
GITHUB_SEARCH_TOPICS = [
    topic.strip()
    for topic in os.getenv(
        "GITHUB_SEARCH_TOPICS", "vibe-coding,cursor-ai,claude-mcp"
    ).split(",")
    if topic.strip()
]
GITHUB_MIN_STARS = int(os.getenv("GITHUB_MIN_STARS", "30"))
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = (
    os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip() or "gemini-2.0-flash"
)
GITHUB_README_EXCERPT_MAX_CHARS = int(
    os.getenv("GITHUB_README_EXCERPT_MAX_CHARS", "4000")
)
AUTO_CURATED_COLLECTION_ENABLED = os.getenv(
    "AUTO_CURATED_COLLECTION_ENABLED", "false"
).strip().lower() in {"1", "true", "yes", "on"}
AUTO_CURATED_COLLECTION_RUN_ON_STARTUP = os.getenv(
    "AUTO_CURATED_COLLECTION_RUN_ON_STARTUP", "false"
).strip().lower() in {"1", "true", "yes", "on"}
AUTO_CURATED_COLLECTION_INTERVAL_SECONDS = max(
    AUTO_CURATED_COLLECTION_MIN_INTERVAL_SECONDS,
    int(os.getenv("AUTO_CURATED_COLLECTION_INTERVAL_SECONDS", "21600")),
)
_RATE_LIMIT_BUCKETS: dict[str, deque[float]] = {}
_RATE_LIMIT_LOCK = Lock()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserContext"


class OAuthCodeExchangeRequest(BaseModel):
    oauth_code: str


class UserContext(TypedDict):
    id: str
    email: str
    nickname: str
    role: str
    status: str
    avatar_url: str | None
    bio: str | None


def build_user_context(user: Mapping[str, object]) -> UserContext:
    return {
        "id": str(user["id"]),
        "email": str(user["email"]),
        "nickname": str(user["nickname"]),
        "role": str(user["role"]),
        "status": str(user.get("status", "pending")),
        "avatar_url": cast(Optional[str], user.get("avatar_url")),
        "bio": cast(Optional[str], user.get("bio")),
    }


class _ReadableResponse(Protocol):
    def __enter__(self) -> "_ReadableResponse": ...
    def __exit__(self, exc_type: object, exc: object, tb: object) -> bool: ...
    def read(self) -> bytes: ...


class AdminReportUpdateRequest(BaseModel):
    status: str
    reason: Optional[str] = None


class AdminUserLimitRequest(BaseModel):
    hours: int = 24
    reason: Optional[str] = None


class AdminUserDeleteScheduleRequest(BaseModel):
    days: int = 30
    reason: Optional[str] = None


class PolicyFilterTab(BaseModel):
    id: str
    label: str


class AdminPolicyUpdateRequest(BaseModel):
    blocked_keywords: list[str]
    auto_hide_report_threshold: int
    home_filter_tabs: Optional[list[PolicyFilterTab]] = None
    explore_filter_tabs: Optional[list[PolicyFilterTab]] = None
    admin_log_retention_days: Optional[int] = None
    admin_log_view_window_days: Optional[int] = None
    admin_log_mask_reasons: Optional[bool] = None
    page_editor_enabled: Optional[bool] = None
    page_editor_rollout_stage: Optional[Literal["qa", "pilot", "open"]] = None
    page_editor_pilot_admin_ids: Optional[list[str]] = None
    page_editor_publish_fail_rate_threshold: Optional[float] = None
    page_editor_rollback_ratio_threshold: Optional[float] = None
    page_editor_conflict_rate_threshold: Optional[float] = None
    curated_review_quality_threshold: Optional[int] = None
    curated_related_click_boost_min_relevance: Optional[int] = None
    curated_related_click_boost_multiplier: Optional[int] = None
    curated_related_click_boost_cap: Optional[int] = None


class AdminOAuthSettingsUpdateRequest(BaseModel):
    google_oauth_enabled: bool
    google_redirect_uri: Optional[str] = None
    google_frontend_redirect_uri: Optional[str] = None


class AdminProjectUpdateRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    demo_url: Optional[str] = None
    repo_url: Optional[str] = None
    platform: Optional[str] = None
    tags: Optional[list[str]] = None
    status: Optional[str] = None
    reason: Optional[str] = None


class AdminActionReasonRequest(BaseModel):
    reason: Optional[str] = None


class AdminUserRoleUpdateRequest(BaseModel):
    role: Literal["user", "admin"]
    reason: Optional[str] = None


class AboutValueItem(BaseModel):
    emoji: str
    title: str
    description: str


class AboutTeamMember(BaseModel):
    name: str
    role: str
    description: str


class AboutFaqItem(BaseModel):
    question: str
    answer: str


class AboutContentUpdateRequest(BaseModel):
    hero_title: str
    hero_highlight: str
    hero_description: str
    contact_email: str
    values: list[AboutValueItem]
    team_members: list[AboutTeamMember]
    faqs: list[AboutFaqItem]
    reason: Optional[str] = None


class PageSeoPayload(BaseModel):
    metaTitle: str
    metaDescription: str
    ogImage: Optional[str] = None


class PageBlockPayload(BaseModel):
    id: str
    type: Literal[
        "hero",
        "rich_text",
        "image",
        "cta",
        "faq",
        "gallery",
        "feature_list",
    ]
    order: int
    visible: bool
    content: dict[str, object]
    style: Optional[dict[str, object]] = None


class PageDocumentPayload(BaseModel):
    pageId: str
    status: Literal["draft", "published"]
    version: int
    title: str
    seo: PageSeoPayload
    blocks: list[PageBlockPayload]
    updatedBy: str
    updatedAt: str


class AdminPageDraftUpdateRequest(BaseModel):
    baseVersion: int
    document: PageDocumentPayload
    reason: Optional[str] = None
    source: Literal["manual", "auto"] = "manual"


class AdminPagePublishRequest(BaseModel):
    reason: Optional[str] = None
    draftVersion: Optional[int] = None


class AdminPagePublishScheduleCreateRequest(BaseModel):
    publishAt: str
    timezone: Optional[str] = "Asia/Seoul"
    reason: Optional[str] = None
    draftVersion: Optional[int] = None


class AdminPagePublishScheduleActionRequest(BaseModel):
    reason: Optional[str] = None


class AdminPagePublishScheduleProcessRequest(BaseModel):
    limit: int = 20
    reason: Optional[str] = None


class AdminPageRollbackRequest(BaseModel):
    targetVersion: int
    reason: Optional[str] = None
    publishNow: bool = False


class AdminPageMigrationExecuteRequest(BaseModel):
    reason: Optional[str] = None
    dryRun: bool = False


class AdminPageMigrationRestoreRequest(BaseModel):
    backupKey: str
    reason: Optional[str] = None
    dryRun: bool = False


class AdminPagePerfEventRequest(BaseModel):
    pageId: str
    scenario: Literal[
        "editor_initial_load",
        "preview_switch",
        "draft_save_roundtrip",
        "panel_canvas_roundtrip_count",
        "edit_completion_time",
        "editor_scroll_distance",
    ]
    durationMs: float
    source: Optional[str] = None


def extract_block_core_fields(
    block: Mapping[str, object],
) -> dict[str, object]:
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
        order_raw = block.get("order")
        if not isinstance(order_raw, int):
            blocking.append(
                {
                    "field": f"blocks[{index}].order",
                    "message": "블록 order는 정수여야 합니다",
                }
            )
            continue
        orders.append(order_raw)
    if len(orders) != len(set(orders)):
        blocking.append(
            {
                "field": "blocks[*].order",
                "message": "블록 order 값이 중복되었습니다",
            }
        )

    for index, block in enumerate(blocks):
        block_type = str(block.get("type") or "")
        content = cast(Mapping[str, object], block.get("content") or {})
        visible = bool(block.get("visible", True))

        def _required(field_name: str, message: str) -> None:
            value = content.get(field_name)
            if isinstance(value, str):
                if value.strip():
                    return
            elif value is not None:
                return
            blocking.append(
                {
                    "field": f"blocks[{index}].content.{field_name}",
                    "message": message,
                }
            )

        if block_type == "hero":
            _required("headline", "Hero headline은 필수입니다")
            headline = str(content.get("headline") or "").strip()
            if len(headline) > 80:
                warnings.append(
                    {
                        "field": f"blocks[{index}].content.headline",
                        "message": "Hero headline 권장 길이(80자)를 초과했습니다",
                    }
                )
        elif block_type == "rich_text":
            if visible:
                _required("body", "RichText body는 필수입니다")
            body = str(content.get("body") or "").strip()
            if len(body) > 2000:
                warnings.append(
                    {
                        "field": f"blocks[{index}].content.body",
                        "message": "RichText body 권장 길이(2000자)를 초과했습니다",
                    }
                )
        elif block_type == "image":
            if visible:
                _required("src", "Image src는 필수입니다")
            src = str(content.get("src") or "").strip()
            if src and not is_valid_http_url(src):
                blocking.append(
                    {
                        "field": f"blocks[{index}].content.src",
                        "message": "Image src URL 형식이 올바르지 않습니다",
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

    return {
        "blocking": blocking,
        "warnings": warnings,
    }


def require_action_reason(reason: Optional[str]) -> str:
    normalized_reason = (reason or "").strip()
    if not normalized_reason:
        raise HTTPException(status_code=400, detail="처리 사유(reason)는 필수입니다")
    return normalized_reason


def validate_enforcement_target(
    target_user_id: str,
    current_user: UserContext,
    *,
    allow_super_admin_target: bool = False,
    allow_admin_target: bool = False,
) -> None:
    if current_user["id"] == target_user_id:
        raise HTTPException(status_code=400, detail="본인 계정에는 적용할 수 없습니다")

    target_user = get_user_by_id(target_user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    target_role = target_user.get("role")
    if target_role == "admin" and not allow_admin_target:
        raise HTTPException(
            status_code=403, detail="관리자 계정에는 적용할 수 없습니다"
        )
    if target_role == "super_admin" and not allow_super_admin_target:
        raise HTTPException(
            status_code=403,
            detail="슈퍼 관리자 계정에는 적용할 수 없습니다",
        )


def ensure_bootstrap_super_admin(user: dict[str, object]) -> dict[str, object]:
    email_raw = user.get("email")
    email = email_raw.strip().lower() if isinstance(email_raw, str) else ""
    if email != SUPER_ADMIN_BOOTSTRAP_EMAIL:
        return user

    role = user.get("role")
    status = user.get("status")
    if role == "super_admin" and status == "active":
        return user

    upgraded = bootstrap_super_admin_user(email)
    if upgraded:
        return cast(dict[str, object], upgraded)
    return user


def get_effective_oauth_settings() -> dict[str, object]:
    runtime = get_oauth_runtime_settings() or {}
    enabled = bool(runtime.get("google_oauth_enabled", False))
    google_redirect_uri = (
        runtime.get("google_redirect_uri") or GOOGLE_REDIRECT_URI or ""
    ).strip()
    google_frontend_redirect_uri = (
        runtime.get("google_frontend_redirect_uri")
        or GOOGLE_FRONTEND_REDIRECT_URI
        or ""
    ).strip()
    return {
        "google_oauth_enabled": enabled,
        "google_redirect_uri": google_redirect_uri,
        "google_frontend_redirect_uri": google_frontend_redirect_uri,
    }


def ensure_google_oauth_available() -> dict[str, object]:
    settings = get_effective_oauth_settings()
    if not settings["google_oauth_enabled"]:
        raise HTTPException(
            status_code=403, detail="Google OAuth가 비활성화되어 있습니다"
        )
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth 설정이 누락되었습니다. GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET를 확인해 주세요",
        )
    if (
        not settings["google_redirect_uri"]
        or not settings["google_frontend_redirect_uri"]
    ):
        raise HTTPException(
            status_code=503,
            detail="Google OAuth 리다이렉트 URI 설정이 누락되었습니다",
        )
    return settings


def build_google_nickname(profile: dict[str, object]) -> str:
    raw_name = profile.get("name")
    preferred_name = raw_name.strip() if isinstance(raw_name, str) else ""
    if preferred_name:
        normalized = re.sub(r"\s+", " ", preferred_name)
        return normalized[:PROFILE_NICKNAME_MAX_LEN]

    raw_email = profile.get("email")
    email = raw_email.strip() if isinstance(raw_email, str) else ""
    local_part = email.split("@")[0] if "@" in email else "user"
    local_part = re.sub(r"[^a-zA-Z0-9_.-]", "", local_part)
    return (local_part or "user")[:PROFILE_NICKNAME_MAX_LEN]


def ensure_unique_nickname(base_nickname: str) -> str:
    trimmed_base = (base_nickname or "user").strip()[:PROFILE_NICKNAME_MAX_LEN]
    if not get_user_by_nickname(trimmed_base):
        return trimmed_base

    for _ in range(10):
        suffix = secrets.token_hex(2)
        max_base = PROFILE_NICKNAME_MAX_LEN - len(suffix) - 1
        candidate = f"{trimmed_base[:max_base]}-{suffix}"
        if not get_user_by_nickname(candidate):
            return candidate

    fallback = f"user-{secrets.token_hex(4)}"
    return fallback[:PROFILE_NICKNAME_MAX_LEN]


def get_about_content_payload() -> dict[str, object]:
    record = get_site_content(ABOUT_CONTENT_KEY)
    if record and record.get("content_json"):
        content = record["content_json"]
        content["updated_at"] = record.get("updated_at")
        return content

    seeded = upsert_site_content(ABOUT_CONTENT_KEY, ABOUT_CONTENT_DEFAULT)
    if not seeded:
        raise HTTPException(status_code=500, detail="소개 페이지 초기화에 실패했습니다")
    content = seeded["content_json"]
    content["updated_at"] = seeded.get("updated_at")
    return content


def build_page_document_from_about_content(
    page_id: str,
    about_content: Mapping[str, object],
    version: int,
) -> dict[str, object]:
    updated_at = str(about_content.get("updated_at") or "")
    hero_block = {
        "id": "hero",
        "type": "hero",
        "order": 0,
        "visible": True,
        "content": {
            "headline": str(about_content.get("hero_title", "")),
            "highlight": str(about_content.get("hero_highlight", "")),
            "description": str(about_content.get("hero_description", "")),
            "contactEmail": str(about_content.get("contact_email", "")),
        },
    }
    values_block = {
        "id": "values",
        "type": "feature_list",
        "order": 1,
        "visible": True,
        "content": {
            "items": cast(list[dict[str, object]], about_content.get("values", [])),
        },
    }
    team_block = {
        "id": "team",
        "type": "feature_list",
        "order": 2,
        "visible": True,
        "content": {
            "items": cast(
                list[dict[str, object]],
                about_content.get("team_members", []),
            ),
        },
    }
    faq_block = {
        "id": "faq",
        "type": "faq",
        "order": 3,
        "visible": True,
        "content": {
            "items": cast(list[dict[str, object]], about_content.get("faqs", [])),
        },
    }

    return {
        "pageId": page_id,
        "status": "draft",
        "version": version,
        "title": "About Page",
        "seo": {
            "metaTitle": str(about_content.get("hero_title", "About")),
            "metaDescription": str(about_content.get("hero_description", "")),
            "ogImage": None,
        },
        "blocks": [hero_block, values_block, team_block, faq_block],
        "updatedBy": "system",
        "updatedAt": updated_at,
    }


def extract_about_content_from_page_document(
    document: Mapping[str, object],
) -> dict[str, object]:
    blocks_raw = document.get("blocks", [])
    blocks = cast(list[dict[str, object]], blocks_raw)
    hero = next(
        (
            block
            for block in blocks
            if block.get("id") == "hero" and block.get("type") == "hero"
        ),
        None,
    )
    values = next((block for block in blocks if block.get("id") == "values"), None)
    team = next((block for block in blocks if block.get("id") == "team"), None)
    faq = next((block for block in blocks if block.get("id") == "faq"), None)

    hero_content = cast(dict[str, object], hero.get("content", {})) if hero else {}
    values_content = (
        cast(dict[str, object], values.get("content", {})) if values else {}
    )
    team_content = cast(dict[str, object], team.get("content", {})) if team else {}
    faq_content = cast(dict[str, object], faq.get("content", {})) if faq else {}
    hero_visible = bool(hero.get("visible", True)) if hero else True
    values_visible = bool(values.get("visible", True)) if values else True
    team_visible = bool(team.get("visible", True)) if team else True
    faq_visible = bool(faq.get("visible", True)) if faq else True

    return {
        "hero_title": str(hero_content.get("headline", "")) if hero_visible else "",
        "hero_highlight": str(hero_content.get("highlight", ""))
        if hero_visible
        else "",
        "hero_description": str(hero_content.get("description", ""))
        if hero_visible
        else "",
        "contact_email": str(hero_content.get("contactEmail", ""))
        if hero_visible
        else "",
        "values": cast(list[dict[str, object]], values_content.get("items", []))
        if values_visible
        else [],
        "team_members": cast(list[dict[str, object]], team_content.get("items", []))
        if team_visible
        else [],
        "faqs": cast(list[dict[str, object]], faq_content.get("items", []))
        if faq_visible
        else [],
    }


def build_page_migration_preview(page_id: str) -> dict[str, object]:
    if page_id != ABOUT_CONTENT_KEY:
        raise HTTPException(
            status_code=404, detail="지원하지 않는 마이그레이션 대상 페이지입니다"
        )

    source_payload = get_about_content_payload()
    transformed_document = build_page_document_from_about_content(
        page_id, source_payload, 0
    )
    issues = collect_page_document_issues(transformed_document)
    blocking = issues["blocking"]
    warnings = issues["warnings"]

    return {
        "pageId": page_id,
        "sourceType": "site_content",
        "sourceKey": ABOUT_CONTENT_KEY,
        "mappingRules": [
            {"from": "hero_*", "to": "hero"},
            {"from": "hero_description", "to": "rich_text"},
            {"from": "hero image", "to": "image"},
            {"from": "contact/link", "to": "cta"},
        ],
        "document": transformed_document,
        "validation": {
            "blocking": blocking,
            "warnings": warnings,
            "blockingCount": len(blocking),
            "warningCount": len(warnings),
        },
    }


def execute_page_migration(
    page_id: str,
    actor_id: str,
    reason: str,
    dry_run: bool,
) -> dict[str, object]:
    preview = build_page_migration_preview(page_id)
    source_payload = get_about_content_payload()
    transformed_document = cast(dict[str, object], preview["document"])
    validation = cast(dict[str, object], preview["validation"])
    blocking = cast(list[dict[str, str]], validation.get("blocking") or [])

    backup_key = f"{ABOUT_CONTENT_KEY}_migration_backup_{int(time.time())}"
    backup_payload: dict[str, object] = {
        "page_id": page_id,
        "source_key": ABOUT_CONTENT_KEY,
        "reason": reason,
        "dry_run": dry_run,
        "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": to_json_compatible(source_payload),
        "document": to_json_compatible(transformed_document),
        "validation": to_json_compatible(validation),
    }
    backup_result = upsert_site_content(backup_key, backup_payload)
    if not backup_result:
        raise HTTPException(
            status_code=500, detail="마이그레이션 백업 생성에 실패했습니다"
        )

    write_admin_action_log(
        admin_id=actor_id,
        action_type="page_migration_backup_created",
        target_type="page",
        target_id=page_action_target_id(page_id),
        reason=f"backup_key={backup_key}",
    )

    if blocking:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "page_migration_validation_failed",
                "message": "마이그레이션 변환 결과에 차단 이슈가 있습니다",
                "field_errors": blocking,
                "backup_key": backup_key,
            },
        )

    if dry_run:
        write_admin_action_log(
            admin_id=actor_id,
            action_type="page_migration_dry_run",
            target_type="page",
            target_id=page_action_target_id(page_id),
            reason=reason,
        )
        return {
            "pageId": page_id,
            "dryRun": True,
            "applied": False,
            "backupKey": backup_key,
            "validation": validation,
        }

    existing_draft = get_page_document_draft(page_id)
    base_version = int(existing_draft.get("draft_version", 0)) if existing_draft else 0
    save_result = save_page_document_draft(
        page_id=page_id,
        base_version=base_version,
        document_json=transformed_document,
        actor_id=actor_id,
        reason=f"migration:{reason}",
    )
    if save_result.get("conflict"):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "page_migration_conflict",
                "message": "마이그레이션 저장 중 버전 충돌이 발생했습니다",
                "current_version": save_result.get("current_version"),
                "backup_key": backup_key,
            },
        )

    saved_version = int(save_result.get("saved_version", 0))
    write_admin_action_log(
        admin_id=actor_id,
        action_type="page_migrated",
        target_type="page",
        target_id=page_action_target_id(page_id),
        reason=f"{reason}; saved_version={saved_version}; backup_key={backup_key}",
    )
    return {
        "pageId": page_id,
        "dryRun": False,
        "applied": True,
        "savedVersion": saved_version,
        "backupKey": backup_key,
        "validation": validation,
    }


def restore_page_migration_backup(
    page_id: str,
    backup_key: str,
    actor_id: str,
    reason: str,
    dry_run: bool,
) -> dict[str, object]:
    backup = get_site_content(backup_key)
    if not backup or not backup.get("content_json"):
        raise HTTPException(status_code=404, detail="백업 키를 찾을 수 없습니다")

    payload = cast(dict[str, object], backup["content_json"])
    backup_page_id = str(payload.get("page_id") or "")
    if backup_page_id != page_id:
        raise HTTPException(
            status_code=400,
            detail="백업 키의 page_id가 요청 경로와 일치하지 않습니다",
        )

    source = cast(dict[str, object], payload.get("source") or {})
    source_key = str(payload.get("source_key") or ABOUT_CONTENT_KEY)
    document = cast(dict[str, object], payload.get("document") or {})
    validation = cast(dict[str, object], payload.get("validation") or {})

    if dry_run:
        write_admin_action_log(
            admin_id=actor_id,
            action_type="page_migration_restore_dry_run",
            target_type="page",
            target_id=page_action_target_id(page_id),
            reason=f"backup_key={backup_key}; {reason}",
        )
        return {
            "pageId": page_id,
            "dryRun": True,
            "restored": False,
            "backupKey": backup_key,
            "validation": validation,
        }

    if page_id == ABOUT_CONTENT_KEY:
        _ = upsert_site_content(ABOUT_CONTENT_KEY, source)

    draft = get_page_document_draft(page_id)
    base_version = int(draft.get("draft_version", 0)) if draft else 0
    save_result = save_page_document_draft(
        page_id=page_id,
        base_version=base_version,
        document_json=document,
        actor_id=actor_id,
        reason=f"migration-restore:{reason}",
    )
    if save_result.get("conflict"):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "page_migration_restore_conflict",
                "message": "복구 저장 중 버전 충돌이 발생했습니다",
                "current_version": save_result.get("current_version"),
            },
        )

    restored_version = int(save_result.get("saved_version", 0))
    write_admin_action_log(
        admin_id=actor_id,
        action_type="page_migration_restored",
        target_type="page",
        target_id=page_action_target_id(page_id),
        reason=f"backup_key={backup_key}; restored_version={restored_version}; {reason}",
    )
    return {
        "pageId": page_id,
        "dryRun": False,
        "restored": True,
        "restoredVersion": restored_version,
        "backupKey": backup_key,
        "validation": validation,
    }


def list_page_migration_backups(page_id: str, limit: int = 20) -> dict[str, object]:
    backups = list_site_contents_by_prefix(f"{page_id}_migration_backup_", limit=limit)
    items: list[dict[str, object]] = []
    for row in backups:
        payload = cast(dict[str, object], row.get("content_json") or {})
        if str(payload.get("page_id") or "") != page_id:
            continue
        items.append(
            {
                "backupKey": str(row.get("content_key") or ""),
                "capturedAt": str(
                    payload.get("captured_at") or row.get("updated_at") or ""
                ),
                "reason": str(payload.get("reason") or ""),
                "dryRun": bool(payload.get("dry_run", False)),
                "sourceKey": str(payload.get("source_key") or ABOUT_CONTENT_KEY),
                "updatedAt": str(row.get("updated_at") or ""),
            }
        )

    return {
        "pageId": page_id,
        "count": len(items),
        "items": items,
    }


def page_action_target_id(page_id: str) -> str:
    if page_id == ABOUT_CONTENT_KEY:
        return ABOUT_CONTENT_TARGET_ID
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"vibecoder:page:{page_id}"))


def curated_collection_action_target_id() -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "vibecoder:curated-collection:scheduler"))


def parse_schedule_publish_at(raw: str) -> datetime:
    normalized = raw.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="publishAt은 필수입니다")
    try:
        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail="publishAt 형식이 올바르지 않습니다"
        ) from exc

    if parsed.tzinfo is not None:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def serialize_publish_schedule(
    record: Mapping[str, object],
) -> dict[str, object]:
    def to_int(value: object, default: int = 0) -> int:
        if isinstance(value, bool):
            return int(value)
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

    return {
        "scheduleId": str(record.get("schedule_id") or ""),
        "pageId": str(record.get("page_id") or ""),
        "draftVersion": to_int(record.get("draft_version"), 0),
        "publishAt": str(record.get("publish_at") or ""),
        "timezone": str(record.get("timezone") or "Asia/Seoul"),
        "status": str(record.get("status") or "scheduled"),
        "reason": str(record.get("reason") or ""),
        "attemptCount": to_int(record.get("attempt_count"), 0),
        "maxAttempts": to_int(record.get("max_attempts"), 3),
        "lastError": str(record.get("last_error") or ""),
        "nextRetryAt": str(record.get("next_retry_at") or ""),
        "createdBy": str(record.get("created_by") or ""),
        "createdAt": str(record.get("created_at") or ""),
        "updatedAt": str(record.get("updated_at") or ""),
        "cancelledAt": str(record.get("cancelled_at") or ""),
        "publishedVersion": to_int(record.get("published_version"), 0),
        "publishedAt": str(record.get("published_at") or ""),
    }


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


def get_effective_blocked_keywords(custom_keywords: list[str]) -> list[str]:
    baseline = [
        keyword
        for keywords in BASELINE_BLOCKED_KEYWORD_CATEGORIES.values()
        for keyword in keywords
    ]
    combined = list(custom_keywords) + baseline
    return normalize_keyword_list(combined)


def text_contains_blocked_keyword(text: str, blocked_keywords: list[str]) -> bool:
    normalized_text = normalize_text_for_filter(text)
    if not normalized_text:
        return False
    return any(keyword in normalized_text for keyword in blocked_keywords)


def get_blocked_user_message(user_status: str) -> str:
    if user_status == "pending":
        return "가입 승인이 대기 중입니다. 관리자 승인 후 로그인할 수 있습니다"
    if user_status == "rejected":
        return "가입이 반려된 계정입니다. 관리자에게 문의해 주세요"
    if user_status == "suspended":
        return "보안 정책으로 계정이 정지되었습니다. 관리자에게 문의해 주세요"
    if user_status == "pending_delete":
        return "삭제 예정 상태의 계정입니다. 관리자에게 문의해 주세요"
    if user_status == "deleted":
        return "삭제된 계정입니다"
    return "활성화되지 않은 계정입니다"


def _extract_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if forwarded_for:
        return forwarded_for

    client = getattr(request, "client", None)
    client_host = getattr(client, "host", "") if client else ""
    return client_host or "unknown"


def enforce_rate_limit(
    bucket: str,
    key: str,
    *,
    limit: int,
    window_seconds: float,
    detail: str,
) -> None:
    now = time.monotonic()
    bucket_key = f"{bucket}:{key}"

    with _RATE_LIMIT_LOCK:
        samples = _RATE_LIMIT_BUCKETS.setdefault(bucket_key, deque())
        while samples and now - samples[0] >= window_seconds:
            samples.popleft()
        if len(samples) >= limit:
            raise HTTPException(status_code=429, detail=detail)
        samples.append(now)


DANGEROUS_COMMAND_TOKENS = ["rm -rf", "sudo", "curl |", "curl|", "chmod 777"]
PROMPT_INJECTION_TOKENS = [
    "ignore previous",
    "위 지시",
    "시스템 프롬프트",
    "system prompt",
]


def classify_error_type(error_message: str) -> str:
    lowered = error_message.lower()
    if "pnpm" in lowered or "node_modules" in lowered:
        return "pnpm"
    if "python" in lowered or "traceback" in lowered or "pip" in lowered:
        return "python"
    if "git" in lowered:
        return "git"
    if "vite" in lowered:
        return "vite"
    return "general"


def contains_prompt_injection(text: str) -> bool:
    lowered = text.lower()
    return any(token in lowered for token in PROMPT_INJECTION_TOKENS)


def is_dangerous_command(command: str) -> bool:
    lowered = command.lower()
    return any(token in lowered for token in DANGEROUS_COMMAND_TOKENS)


def build_error_solution_fallback(error_message: str) -> dict[str, object]:
    error_type = classify_error_type(error_message)
    if error_type == "pnpm":
        fix_steps = [
            {
                "description": "필요한 파일들을 다시 설치해요",
                "command": "pnpm install",
            }
        ]
        plan_b = {
            "description": "설치 파일이 꼬였을 때 초기화 후 다시 설치",
            "command": "rm -rf node_modules && pnpm install",
        }
        what_happened = "앱 실행에 필요한 파일이 없거나 깨진 상태예요."
    elif error_type == "python":
        fix_steps = [
            {
                "description": "가상환경 기준 의존성을 다시 맞춰요",
                "command": "uv sync --frozen",
            }
        ]
        plan_b = {
            "description": "가상환경을 다시 만들고 동기화해요",
            "command": "uv sync",
        }
        what_happened = "파이썬 실행에 필요한 패키지 버전이 맞지 않아요."
    elif error_type == "git":
        fix_steps = [
            {
                "description": "현재 변경 상태를 먼저 확인해요",
                "command": "git status",
            }
        ]
        plan_b = {
            "description": "원격/브랜치 연결 상태를 점검해요",
            "command": "git remote -v",
        }
        what_happened = "Git 작업 순서나 브랜치 상태가 맞지 않아 멈춘 상태예요."
    elif error_type == "vite":
        fix_steps = [
            {
                "description": "개발 서버를 다시 시작해요",
                "command": "pnpm dev",
            }
        ]
        plan_b = {
            "description": "캐시 영향을 줄이기 위해 재설치 후 다시 실행해요",
            "command": "pnpm install && pnpm dev",
        }
        what_happened = "프론트 개발 서버가 필요한 파일을 읽지 못한 상태예요."
    else:
        fix_steps = [
            {
                "description": "의존성/실행 상태를 기본 명령으로 점검해요",
                "command": "pnpm install",
            }
        ]
        plan_b = {
            "description": "환경 재동기화 후 다시 시도해요",
            "command": "uv sync --frozen",
        }
        what_happened = "실행에 필요한 환경이나 설정 중 일부가 맞지 않는 상태예요."

    safe_fix_steps = [
        step
        for step in fix_steps
        if not is_dangerous_command(str(step.get("command") or ""))
    ]

    return {
        "what_happened": what_happened,
        "fix_steps": safe_fix_steps,
        "plan_b": plan_b,
        "error_type": error_type,
    }


def find_related_glossary_terms(text: str) -> list[str]:
    lowered = text.lower()
    matches: list[str] = []
    glossary_pairs = [
        ("API", ["api"]),
        ("서버", ["server"]),
        ("클라이언트", ["client"]),
        ("레포지토리", ["repository", "repo"]),
        ("pnpm", ["pnpm"]),
        ("pnpm install", ["pnpm install"]),
        ("pnpm dev", ["pnpm dev"]),
        ("git", ["git"]),
        ("포트", ["port", "localhost:"]),
        ("node_modules", ["node_modules"]),
        ("package.json", ["package.json"]),
        (".env", [".env", "env file", "environment variable"]),
        ("README.md", ["readme"]),
        ("배포", ["deploy", "deployment"]),
        ("도메인", ["domain"]),
        ("HTTPS", ["https", "ssl"]),
        ("MCP", ["mcp"]),
        ("프롬프트", ["prompt"]),
        ("토큰", ["token"]),
        ("CORS", ["cors"]),
    ]

    for label, keywords in glossary_pairs:
        if any(keyword in lowered for keyword in keywords):
            matches.append(label)

    return matches[:5]


def build_text_translation_fallback(input_text: str) -> dict[str, object]:
    lowered = input_text.lower()
    commands = re.findall(
        r"(?:^|\n)\s*((?:pnpm|npm|git|uv|python|pip|npx|bun|docker)\s+[^\n`]+)",
        input_text,
        flags=re.IGNORECASE,
    )
    normalized_commands: list[dict[str, str]] = []
    for raw_command in commands[:3]:
        command = " ".join(raw_command.strip().split())
        if not command or is_dangerous_command(command):
            continue
        normalized_commands.append(
            {
                "description": "원문에 나온 실행 명령어예요.",
                "command": command,
            }
        )

    if "upstream" in lowered and "origin" in lowered and "main" in lowered:
        korean_summary = "새 Git 저장소를 만들고 GitHub 원격 저장소를 기본 브랜치와 연결하라는 뜻이에요."
        simple_analogy = (
            "새 일기장을 만들고 클라우드 백업 주소를 처음 연결하는 단계라고 보면 돼요."
        )
        if not normalized_commands:
            normalized_commands = [
                {
                    "description": "새 Git 기록을 시작해요.",
                    "command": "git init",
                },
                {
                    "description": "GitHub 주소를 origin이라는 이름으로 연결해요.",
                    "command": "git remote add origin <github-url>",
                },
                {
                    "description": "기본 브랜치를 main으로 맞춰요.",
                    "command": "git branch -M main",
                },
            ]
    elif "readme" in lowered:
        korean_summary = (
            "프로젝트 설명서를 읽고 설치나 실행 순서를 따라가라는 뜻이에요."
        )
        simple_analogy = "새 가전제품을 샀을 때 설명서를 먼저 펴보는 상황과 비슷해요."
    elif commands:
        korean_summary = "기술 설명 속에 실행해야 할 명령어가 함께 들어 있어요. 순서대로 따라 하면 되는 안내문에 가깝습니다."
        simple_analogy = (
            "요리 레시피에서 재료와 조리 순서가 함께 적힌 카드라고 생각하면 쉬워요."
        )
    else:
        korean_summary = "기술적인 문장을 쉬운 한국어로 풀어보면, 무엇을 하려는지와 왜 필요한지를 설명하는 안내문이에요."
        simple_analogy = (
            "전문가용 설명서를 친구가 쉬운 말로 다시 읽어주는 느낌이라고 보면 돼요."
        )

    return {
        "korean_summary": korean_summary,
        "simple_analogy": simple_analogy,
        "commands": normalized_commands,
        "related_terms": find_related_glossary_terms(input_text),
    }


def _extract_gemini_text(payload: object) -> str:
    if not isinstance(payload, Mapping):
        raise RuntimeError("Gemini response payload was not an object")

    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise RuntimeError("Gemini response did not include candidates")

    first_candidate = candidates[0]
    if not isinstance(first_candidate, Mapping):
        raise RuntimeError("Gemini candidate was not an object")

    content = first_candidate.get("content")
    if not isinstance(content, Mapping):
        raise RuntimeError("Gemini response did not include content")

    parts = content.get("parts")
    if not isinstance(parts, list) or not parts:
        raise RuntimeError("Gemini response did not include text parts")

    text_parts: list[str] = []
    for part in parts:
        if isinstance(part, Mapping):
            text = part.get("text")
            if isinstance(text, str) and text.strip():
                text_parts.append(text)

    if not text_parts:
        raise RuntimeError("Gemini response did not include text parts")

    return "\n".join(text_parts).strip()


def _build_text_translate_prompt(input_text: str) -> str:
    return f"""
다음 기술적인 텍스트를 코딩을 전혀 모르는 한국인이 이해할 수 있게 설명해줘.

원문:
{input_text}

다음 형식으로 JSON만 응답:
{{
  "korean_summary": "무슨 말인지 2~3줄 한국어 요약 (기술 용어 최소화)",
  "simple_analogy": "한국 일상으로 비유한 한 줄 설명",
  "commands": [
    {{"description": "이 명령어가 하는 일", "command": "실행할 명령어"}}
  ],
  "related_terms": ["관련 용어1", "용어2"]
}}

원칙:
- 기술 용어를 쓸 때는 바로 뒤에 쉬운 한국어 설명을 붙일 것
- 비유는 반드시 한국 일상 소재 사용 (식당, 마트, 아파트, 게임 등)
- 명령어가 없으면 commands는 빈 배열
- 위험 명령어는 commands에 넣지 말 것 (`rm -rf`, `sudo`, `curl|bash`, `chmod 777` 등)
""".strip()


def _normalize_text_translate_result(
    parsed: object, input_text: str
) -> dict[str, object]:
    if not isinstance(parsed, Mapping):
        raise RuntimeError("Gemini translation output was not an object")

    korean_summary = str(parsed.get("korean_summary") or "").strip()
    simple_analogy = str(parsed.get("simple_analogy") or "").strip()
    if len(korean_summary) < 10 or len(simple_analogy) < 10:
        raise RuntimeError("Gemini translation output was too short")

    commands: list[dict[str, str]] = []
    raw_commands = parsed.get("commands")
    if isinstance(raw_commands, list):
        for item in raw_commands:
            if not isinstance(item, Mapping):
                continue
            description = str(item.get("description") or "").strip()
            command = " ".join(str(item.get("command") or "").strip().split())
            if not description or not command or is_dangerous_command(command):
                continue
            commands.append({"description": description, "command": command})

    related_terms: list[str] = []
    raw_related_terms = parsed.get("related_terms")
    if isinstance(raw_related_terms, list):
        for item in raw_related_terms:
            if (
                isinstance(item, str)
                and item.strip()
                and item.strip() not in related_terms
            ):
                related_terms.append(item.strip())

    if not related_terms:
        related_terms = find_related_glossary_terms(input_text)

    return {
        "korean_summary": korean_summary,
        "simple_analogy": simple_analogy,
        "commands": commands,
        "related_terms": related_terms[:5],
    }


def translate_text_with_gemini(
    input_text: str,
    *,
    api_key: str,
    model: str = GEMINI_MODEL,
    timeout_seconds: int = 20,
) -> dict[str, object]:
    cleaned_key = api_key.strip()
    if not cleaned_key:
        raise RuntimeError("Gemini API key is required")

    request_payload = {
        "contents": [{"parts": [{"text": _build_text_translate_prompt(input_text)}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    request = UrlRequest(
        (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={cleaned_key}"
        ),
        data=json.dumps(request_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            raw_bytes = cast(bytes, response.read())
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"Gemini API request failed: {exc.code} {detail}".strip()
        ) from exc
    except URLError as exc:
        raise RuntimeError(f"Gemini API request failed: {exc.reason}") from exc

    payload = json.loads(raw_bytes.decode("utf-8"))
    response_text = _extract_gemini_text(payload)
    parsed = json.loads(response_text)
    return _normalize_text_translate_result(parsed, input_text)


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
    value: object,
    fallback: int,
    minimum: int,
    maximum: int,
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


def mask_sensitive_reason(reason: Optional[str], mask_enabled: bool) -> Optional[str]:
    if reason is None:
        return None

    normalized = reason.strip()
    if not normalized or not mask_enabled:
        return normalized

    patterns = [
        (r"([\w.+-]+)@([\w.-]+\.[A-Za-z]{2,})", "[masked-email]"),
        (r"\b(01[0-9]-?\d{3,4}-?\d{4})\b", "[masked-phone]"),
        (r"\b(Bearer\s+[A-Za-z0-9._-]+)\b", "[masked-token]"),
        (r"\b(sk-[A-Za-z0-9]{10,})\b", "[masked-secret]"),
        (
            r"\b([A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{20,})\b",
            "[masked-jwt]",
        ),
    ]

    masked = normalized
    for pattern, replacement in patterns:
        masked = re.sub(pattern, replacement, masked)
    return masked


def write_admin_action_log(
    admin_id: str,
    action_type: str,
    target_type: str,
    target_id: str,
    reason: Optional[str],
    metadata: Optional[Mapping[str, object]] = None,
) -> None:
    settings = get_effective_moderation_settings()
    mask_enabled = bool(settings.get("admin_log_mask_reasons", True))
    sanitized_reason = mask_sensitive_reason(reason, mask_enabled)
    create_admin_action_log(
        admin_id=admin_id,
        action_type=action_type,
        target_type=target_type,
        target_id=target_id,
        reason=sanitized_reason,
        metadata=metadata,
    )


def log_curated_collection_action(
    *, action_type: str, created: int, message: Optional[str] = None
) -> None:
    detail = f"created={max(created, 0)}"
    normalized_message = str(message or "").strip()
    if normalized_message:
        detail = f"{detail}; message={normalized_message}"
    write_admin_action_log(
        admin_id=SYSTEM_ADMIN_USER_ID,
        action_type=action_type,
        target_type="system",
        target_id=curated_collection_action_target_id(),
        reason=detail,
    )


def _coerce_policy_metadata_value(value: object) -> object:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, list):
        return [_coerce_policy_metadata_value(item) for item in value]
    if isinstance(value, tuple):
        return [_coerce_policy_metadata_value(item) for item in value]
    if isinstance(value, Mapping):
        return {
            str(key): _coerce_policy_metadata_value(item) for key, item in value.items()
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
        previous_value = _coerce_policy_metadata_value(previous_settings.get(key))
        next_value = _coerce_policy_metadata_value(next_settings.get(key))
        if previous_value != next_value:
            changed_fields[key] = {
                "previous": previous_value,
                "next": next_value,
            }

    return {
        "event": "policy_update",
        "changed_fields": changed_fields,
        "curated_quality_threshold": {
            "previous": _coerce_policy_metadata_value(
                previous_settings.get("curated_review_quality_threshold")
            ),
            "next": _coerce_policy_metadata_value(
                next_settings.get("curated_review_quality_threshold")
            ),
        },
    }


def get_effective_moderation_settings() -> dict[str, object]:
    settings = get_moderation_settings()
    if not settings:
        raise HTTPException(status_code=404, detail="정책 설정을 찾을 수 없습니다")

    effective_keywords = get_effective_blocked_keywords(
        settings.get("blocked_keywords") or []
    )
    raw_keywords = settings.get("blocked_keywords") or []
    normalized_raw_keywords = normalize_keyword_list(raw_keywords)
    baseline_keywords = normalize_keyword_list(
        [
            keyword
            for keywords in BASELINE_BLOCKED_KEYWORD_CATEGORIES.values()
            for keyword in keywords
        ]
    )
    custom_keywords = [
        keyword
        for keyword in normalized_raw_keywords
        if keyword not in baseline_keywords
    ]
    home_filter_tabs = normalize_filter_tabs(
        settings.get("home_filter_tabs"),
        DEFAULT_HOME_FILTER_TABS,
    )
    explore_filter_tabs = normalize_filter_tabs(
        settings.get("explore_filter_tabs"),
        DEFAULT_EXPLORE_FILTER_TABS,
    )
    admin_log_retention_days = normalize_positive_int(
        settings.get("admin_log_retention_days"),
        DEFAULT_ADMIN_LOG_RETENTION_DAYS,
        minimum=30,
        maximum=3650,
    )
    admin_log_view_window_days = normalize_positive_int(
        settings.get("admin_log_view_window_days"),
        DEFAULT_ADMIN_LOG_VIEW_WINDOW_DAYS,
        minimum=1,
        maximum=365,
    )
    admin_log_mask_reasons = bool(settings.get("admin_log_mask_reasons", True))
    page_editor_enabled = bool(settings.get("page_editor_enabled", True))
    page_editor_rollout_stage = normalize_rollout_stage(
        settings.get("page_editor_rollout_stage"),
        DEFAULT_PAGE_EDITOR_ROLLOUT_STAGE,
    )
    page_editor_pilot_admin_ids_raw = settings.get("page_editor_pilot_admin_ids") or []
    page_editor_pilot_admin_ids = sorted(
        {
            str(admin_id).strip()
            for admin_id in page_editor_pilot_admin_ids_raw
            if str(admin_id).strip()
        }
    )
    page_editor_publish_fail_rate_threshold = normalize_ratio(
        settings.get("page_editor_publish_fail_rate_threshold"),
        DEFAULT_PAGE_EDITOR_PUBLISH_FAIL_RATE_THRESHOLD,
    )
    page_editor_rollback_ratio_threshold = normalize_ratio(
        settings.get("page_editor_rollback_ratio_threshold"),
        DEFAULT_PAGE_EDITOR_ROLLBACK_RATIO_THRESHOLD,
    )
    page_editor_conflict_rate_threshold = normalize_ratio(
        settings.get("page_editor_conflict_rate_threshold"),
        DEFAULT_PAGE_EDITOR_CONFLICT_RATE_THRESHOLD,
    )
    curated_review_quality_threshold = normalize_positive_int(
        settings.get("curated_review_quality_threshold"),
        DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD,
        minimum=1,
        maximum=100,
    )
    curated_related_click_boost_min_relevance = normalize_positive_int(
        settings.get("curated_related_click_boost_min_relevance"),
        DEFAULT_CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE,
        minimum=1,
        maximum=100,
    )
    curated_related_click_boost_multiplier = normalize_positive_int(
        settings.get("curated_related_click_boost_multiplier"),
        DEFAULT_CURATED_RELATED_CLICK_BOOST_MULTIPLIER,
        minimum=1,
        maximum=200,
    )
    curated_related_click_boost_cap = normalize_positive_int(
        settings.get("curated_related_click_boost_cap"),
        DEFAULT_CURATED_RELATED_CLICK_BOOST_CAP,
        minimum=1,
        maximum=500,
    )
    baseline_categories = {
        category: normalize_keyword_list(keywords)
        for category, keywords in BASELINE_BLOCKED_KEYWORD_CATEGORIES.items()
    }
    latest_policy_action = get_latest_policy_update_action()

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
        "curated_review_quality_threshold": curated_review_quality_threshold,
        "curated_related_click_boost_min_relevance": curated_related_click_boost_min_relevance,
        "curated_related_click_boost_multiplier": curated_related_click_boost_multiplier,
        "curated_related_click_boost_cap": curated_related_click_boost_cap,
        "updated_at": settings["updated_at"],
        "last_updated_by": last_updated_by,
        "last_updated_by_id": last_updated_by_id,
        "last_updated_action_at": last_updated_action_at,
    }


def ensure_baseline_moderation_settings() -> None:
    settings = get_moderation_settings()
    if not settings:
        return

    effective_keywords = get_effective_blocked_keywords(
        settings.get("blocked_keywords") or []
    )
    home_filter_tabs = normalize_filter_tabs(
        settings.get("home_filter_tabs"),
        DEFAULT_HOME_FILTER_TABS,
    )
    explore_filter_tabs = normalize_filter_tabs(
        settings.get("explore_filter_tabs"),
        DEFAULT_EXPLORE_FILTER_TABS,
    )
    admin_log_retention_days = normalize_positive_int(
        settings.get("admin_log_retention_days"),
        DEFAULT_ADMIN_LOG_RETENTION_DAYS,
        minimum=30,
        maximum=3650,
    )
    admin_log_view_window_days = normalize_positive_int(
        settings.get("admin_log_view_window_days"),
        DEFAULT_ADMIN_LOG_VIEW_WINDOW_DAYS,
        minimum=1,
        maximum=365,
    )
    admin_log_mask_reasons = bool(settings.get("admin_log_mask_reasons", True))
    page_editor_enabled = bool(settings.get("page_editor_enabled", True))
    page_editor_rollout_stage = normalize_rollout_stage(
        settings.get("page_editor_rollout_stage"),
        DEFAULT_PAGE_EDITOR_ROLLOUT_STAGE,
    )
    page_editor_pilot_admin_ids_raw = settings.get("page_editor_pilot_admin_ids") or []
    page_editor_pilot_admin_ids = sorted(
        {
            str(admin_id).strip()
            for admin_id in page_editor_pilot_admin_ids_raw
            if str(admin_id).strip()
        }
    )
    page_editor_publish_fail_rate_threshold = normalize_ratio(
        settings.get("page_editor_publish_fail_rate_threshold"),
        DEFAULT_PAGE_EDITOR_PUBLISH_FAIL_RATE_THRESHOLD,
    )
    page_editor_rollback_ratio_threshold = normalize_ratio(
        settings.get("page_editor_rollback_ratio_threshold"),
        DEFAULT_PAGE_EDITOR_ROLLBACK_RATIO_THRESHOLD,
    )
    page_editor_conflict_rate_threshold = normalize_ratio(
        settings.get("page_editor_conflict_rate_threshold"),
        DEFAULT_PAGE_EDITOR_CONFLICT_RATE_THRESHOLD,
    )
    curated_review_quality_threshold = normalize_positive_int(
        settings.get("curated_review_quality_threshold"),
        DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD,
        minimum=1,
        maximum=100,
    )
    curated_related_click_boost_min_relevance = normalize_positive_int(
        settings.get("curated_related_click_boost_min_relevance"),
        DEFAULT_CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE,
        minimum=1,
        maximum=100,
    )
    curated_related_click_boost_multiplier = normalize_positive_int(
        settings.get("curated_related_click_boost_multiplier"),
        DEFAULT_CURATED_RELATED_CLICK_BOOST_MULTIPLIER,
        minimum=1,
        maximum=200,
    )
    curated_related_click_boost_cap = normalize_positive_int(
        settings.get("curated_related_click_boost_cap"),
        DEFAULT_CURATED_RELATED_CLICK_BOOST_CAP,
        minimum=1,
        maximum=500,
    )
    if (
        effective_keywords != (settings.get("blocked_keywords") or [])
        or home_filter_tabs != (settings.get("home_filter_tabs") or [])
        or explore_filter_tabs != (settings.get("explore_filter_tabs") or [])
        or admin_log_retention_days != settings.get("admin_log_retention_days")
        or admin_log_view_window_days != settings.get("admin_log_view_window_days")
        or admin_log_mask_reasons != settings.get("admin_log_mask_reasons")
        or page_editor_enabled != settings.get("page_editor_enabled")
        or page_editor_rollout_stage != settings.get("page_editor_rollout_stage")
        or page_editor_pilot_admin_ids
        != (settings.get("page_editor_pilot_admin_ids") or [])
        or page_editor_publish_fail_rate_threshold
        != normalize_ratio(
            settings.get("page_editor_publish_fail_rate_threshold"),
            DEFAULT_PAGE_EDITOR_PUBLISH_FAIL_RATE_THRESHOLD,
        )
        or page_editor_rollback_ratio_threshold
        != normalize_ratio(
            settings.get("page_editor_rollback_ratio_threshold"),
            DEFAULT_PAGE_EDITOR_ROLLBACK_RATIO_THRESHOLD,
        )
        or page_editor_conflict_rate_threshold
        != normalize_ratio(
            settings.get("page_editor_conflict_rate_threshold"),
            DEFAULT_PAGE_EDITOR_CONFLICT_RATE_THRESHOLD,
        )
        or curated_review_quality_threshold
        != normalize_positive_int(
            settings.get("curated_review_quality_threshold"),
            DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD,
            minimum=1,
            maximum=100,
        )
        or curated_related_click_boost_min_relevance
        != normalize_positive_int(
            settings.get("curated_related_click_boost_min_relevance"),
            DEFAULT_CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE,
            minimum=1,
            maximum=100,
        )
        or curated_related_click_boost_multiplier
        != normalize_positive_int(
            settings.get("curated_related_click_boost_multiplier"),
            DEFAULT_CURATED_RELATED_CLICK_BOOST_MULTIPLIER,
            minimum=1,
            maximum=200,
        )
        or curated_related_click_boost_cap
        != normalize_positive_int(
            settings.get("curated_related_click_boost_cap"),
            DEFAULT_CURATED_RELATED_CLICK_BOOST_CAP,
            minimum=1,
            maximum=500,
        )
    ):
        update_moderation_settings(
            blocked_keywords=effective_keywords,
            auto_hide_report_threshold=settings["auto_hide_report_threshold"],
            home_filter_tabs=home_filter_tabs,
            explore_filter_tabs=explore_filter_tabs,
            admin_log_retention_days=admin_log_retention_days,
            admin_log_view_window_days=admin_log_view_window_days,
            admin_log_mask_reasons=admin_log_mask_reasons,
            page_editor_enabled=page_editor_enabled,
            page_editor_rollout_stage=page_editor_rollout_stage,
            page_editor_pilot_admin_ids=page_editor_pilot_admin_ids,
            page_editor_publish_fail_rate_threshold=page_editor_publish_fail_rate_threshold,
            page_editor_rollback_ratio_threshold=page_editor_rollback_ratio_threshold,
            page_editor_conflict_rate_threshold=page_editor_conflict_rate_threshold,
            curated_review_quality_threshold=curated_review_quality_threshold,
            curated_related_click_boost_min_relevance=curated_related_click_boost_min_relevance,
            curated_related_click_boost_multiplier=curated_related_click_boost_multiplier,
            curated_related_click_boost_cap=curated_related_click_boost_cap,
        )


def perform_due_user_deletion_cleanup() -> int:
    deleted_users = purge_due_user_deletions(limit=200)
    for deleted_user in deleted_users:
        target_id = str(deleted_user["id"])
        write_admin_action_log(
            admin_id=SYSTEM_ADMIN_USER_ID,
            action_type="user_deleted",
            target_type="user",
            target_id=target_id,
            reason="삭제 예약 만료로 자동 삭제 처리",
        )
    return len(deleted_users)


async def run_admin_log_cleanup_loop() -> None:
    while True:
        try:
            settings = get_effective_moderation_settings()
            retention_days = cast(int, settings["admin_log_retention_days"])
            deleted_count = cleanup_admin_action_logs(retention_days=retention_days)
            if deleted_count > 0:
                print(f"[admin-log] cleaned up {deleted_count} expired action logs")
            user_deleted_count = perform_due_user_deletion_cleanup()
            if user_deleted_count > 0:
                print(
                    f"[admin-user] auto-deleted {user_deleted_count} due pending_delete accounts"
                )
        except Exception as error:
            print(f"[admin-log] cleanup loop error: {error}")
        await asyncio.sleep(ADMIN_LOG_CLEANUP_INTERVAL_SECONDS)


async def run_curated_collection_scheduler_iteration() -> None:
    try:
        result = perform_curated_collection_run(allow_sample_fallback=False)
        created = safe_int(result.get("created"), 0)
        message = str(result.get("message") or "").strip()
        action_type = "curated_collection_succeeded"
        if message and created == 0:
            action_type = "curated_collection_skipped"
        log_curated_collection_action(
            action_type=action_type,
            created=created,
            message=message,
        )
        if created > 0 or message:
            log_line = (
                f"[curated-scheduler] created={created} "
                f"collected_today={safe_int(result.get('collected_today'), 0)} "
                f"daily_limit={safe_int(result.get('daily_limit'), 0)} "
                f"message={message or 'none'}"
            )
            print(log_line)
    except Exception as error:
        log_curated_collection_action(
            action_type="curated_collection_failed",
            created=0,
            message=str(error),
        )
        print(f"[curated-scheduler] loop error: {error}")


# ============ Startup Event ============


async def _startup_event_impl() -> None:
    """앱 시작 시 DB 테이블 초기화"""
    try:
        init_db()
        ensure_baseline_moderation_settings()
        settings = get_effective_moderation_settings()
        _ = cleanup_admin_action_logs(
            retention_days=cast(int, settings["admin_log_retention_days"])
        )
        _ = perform_due_user_deletion_cleanup()
        _ = get_about_content_payload()
        _set_cached_projects(
            sort="latest", platform=None, tag=None, items=get_projects(sort="latest")
        )
        global _admin_log_cleanup_task, _curated_collection_task
        if _admin_log_cleanup_task is None or _admin_log_cleanup_task.done():
            _admin_log_cleanup_task = asyncio.create_task(run_admin_log_cleanup_loop())
        if AUTO_CURATED_COLLECTION_ENABLED and (
            _curated_collection_task is None or _curated_collection_task.done()
        ):
            _curated_collection_task = asyncio.create_task(
                run_periodic_async_loop(
                    interval_seconds=AUTO_CURATED_COLLECTION_INTERVAL_SECONDS,
                    callback=run_curated_collection_scheduler_iteration,
                    run_immediately=AUTO_CURATED_COLLECTION_RUN_ON_STARTUP,
                )
            )
    except Exception as e:
        print(f"⚠️  DB initialization warning: {e}")


async def _shutdown_event_impl() -> None:
    global _admin_log_cleanup_task, _curated_collection_task
    await cancel_background_task(_curated_collection_task)
    _curated_collection_task = None
    await cancel_background_task(_admin_log_cleanup_task)
    _admin_log_cleanup_task = None


# ============ Health Check ============


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def get_public_base_url(request: Request) -> str:
    if PUBLIC_BASE_URL:
        return PUBLIC_BASE_URL

    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip()
    forwarded_host = request.headers.get("x-forwarded-host", "").split(",")[0].strip()
    scheme = forwarded_proto or str(
        request.scope.get("scheme") or request.url.scheme or "http"
    )
    host = forwarded_host or request.headers.get("host") or request.url.netloc
    return f"{scheme}://{host}".rstrip("/")


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap_xml(request: Request) -> Response:
    base_url = get_public_base_url(request)
    static_urls: list[tuple[str, str, str]] = [
        ("/", "daily", "1.0"),
        ("/explore", "daily", "0.9"),
        ("/about", "monthly", "0.7"),
        ("/challenges", "weekly", "0.8"),
    ]
    projects = get_projects(sort="latest")

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for path, changefreq, priority in static_urls:
        lines.extend(
            [
                "  <url>",
                f"    <loc>{xml_escape(f'{base_url}{path}')}</loc>",
                f"    <changefreq>{changefreq}</changefreq>",
                f"    <priority>{priority}</priority>",
                "  </url>",
            ]
        )

    for project in projects:
        project_id = str(project["id"])
        project_url = f"{base_url}/project/{quote(project_id, safe='')}"
        lines.extend(
            [
                "  <url>",
                f"    <loc>{xml_escape(project_url)}</loc>",
                "    <changefreq>weekly</changefreq>",
                "    <priority>0.8</priority>",
                "  </url>",
            ]
        )

    lines.append("</urlset>")
    return Response(content="\n".join(lines), media_type="application/xml")


@app.get("/api/content/about")
def get_about_content_endpoint():
    return get_about_content_payload()


@app.get("/api/content/filter-tabs")
def get_filter_tabs_endpoint() -> dict[str, list[dict[str, str]]]:
    settings = get_effective_moderation_settings()
    return {
        "home_filter_tabs": cast(list[dict[str, str]], settings["home_filter_tabs"]),
        "explore_filter_tabs": cast(
            list[dict[str, str]],
            settings["explore_filter_tabs"],
        ),
    }


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


def require_admin_from_request(request: Request) -> UserContext:
    auth_header = request.headers.get("authorization", "")
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()

    if not token:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다")

    decoded = decode_token(token)
    user_id = decoded.get("sub") if decoded else None
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    user = ensure_bootstrap_super_admin(user)

    role = str(user.get("role") or "")
    if role not in ADMIN_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return build_user_context(user)


_KNOWN_LICENSE_EXPLANATIONS: dict[str, str] = {
    "MIT": "자유롭게 사용, 수정, 배포할 수 있어요. 출처(저작권 표시)만 남겨두면 돼요. 상업적으로 써도 괜찮아요.",
    "Apache-2.0": "자유롭게 사용, 수정, 배포할 수 있어요. 출처 표시가 필요하고, 특허 분쟁으로부터 보호받을 수 있는 조항도 포함돼 있어요.",
    "GPL-2.0": "사용·수정은 자유롭지만, 이 코드를 포함해 배포할 때는 소스코드를 반드시 함께 공개해야 해요.",
    "GPL-2.0-only": "사용·수정은 자유롭지만, 이 코드를 포함해 배포할 때는 소스코드를 반드시 함께 공개해야 해요.",
    "GPL-3.0": "사용·수정은 자유롭지만, 배포 시 소스코드 공개가 필수예요. GPL-2.0보다 특허 보호 조항이 더 강해요.",
    "GPL-3.0-only": "사용·수정은 자유롭지만, 배포 시 소스코드 공개가 필수예요. GPL-2.0보다 특허 보호 조항이 더 강해요.",
    "LGPL-2.1": "라이브러리로 가져다 쓰는 건 자유로워요. 단, 이 라이브러리 자체를 수정해서 배포할 때만 소스 공개가 필요해요.",
    "LGPL-3.0": "라이브러리로 가져다 쓰는 건 자유로워요. 단, 이 라이브러리 자체를 수정해서 배포할 때만 소스 공개가 필요해요.",
    "LGPL-3.0-only": "라이브러리로 가져다 쓰는 건 자유로워요. 단, 이 라이브러리 자체를 수정해서 배포할 때만 소스 공개가 필요해요.",
    "AGPL-3.0": "서버에서 서비스로 제공할 때도 소스코드를 공개해야 해요. 웹 서비스에도 오픈소스 의무가 적용돼요.",
    "AGPL-3.0-only": "서버에서 서비스로 제공할 때도 소스코드를 공개해야 해요. 웹 서비스에도 오픈소스 의무가 적용돼요.",
    "BSD-2-Clause": "자유롭게 사용, 수정, 배포할 수 있어요. 출처 표시와 라이선스 문구를 유지하면 돼요.",
    "BSD-3-Clause": "자유롭게 사용, 수정, 배포할 수 있어요. 출처 표시가 필요하고, 제작자 이름을 홍보에 무단으로 쓰면 안 돼요.",
    "ISC": "MIT와 거의 같아요. 자유롭게 사용·수정·배포 가능하고 출처만 표시하면 돼요.",
    "MPL-2.0": "수정한 파일만 소스를 공개하면 되고, 나머지 코드는 비공개로 유지해도 돼요.",
    "CC0-1.0": "저작권을 완전히 포기한 라이선스예요. 아무런 제한 없이 자유롭게 사용해도 돼요.",
    "Unlicense": "공공 도메인이에요. 출처 표시도 필요 없고 완전히 자유롭게 쓸 수 있어요.",
    "0BSD": "아무 조건 없이 자유롭게 사용할 수 있어요. 출처 표시도 필요 없어요.",
}


def _get_known_license_explanation(spdx_id: str) -> str | None:
    normalized = spdx_id.strip()
    if normalized in _KNOWN_LICENSE_EXPLANATIONS:
        return _KNOWN_LICENSE_EXPLANATIONS[normalized]
    return None


def _build_license_explain_prompt(license_text: str, repo_title: str) -> str:
    return (
        f"다음은 '{repo_title}' 프로젝트의 라이선스 전문이야. "
        "중학생도 쉽게 이해할 수 있는 한국어로 2~3문장으로 설명해줘. "
        "상업적 사용 가능 여부, 수정 가능 여부, 배포 시 조건을 반드시 포함해. "
        "법률 용어 없이 친근한 말투로 써줘.\n\n"
        f"라이선스 내용:\n{license_text}"
    )


def _explain_license_with_gemini(
    license_text: str,
    repo_title: str,
    *,
    api_key: str,
    model: str,
) -> str:
    prompt = _build_license_explain_prompt(license_text, repo_title)
    request_payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 300},
    }
    request = UrlRequest(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
        data=json.dumps(request_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            raw_bytes = cast(bytes, response.read())
        payload = json.loads(raw_bytes.decode("utf-8"))
        return _extract_gemini_text(payload).strip()
    except Exception:
        return ""


def generate_license_explanation(
    spdx_id: str,
    owner: str,
    repo_name: str,
    repo_title: str,
    github_token: str,
) -> str:
    known = _get_known_license_explanation(spdx_id)
    if known:
        return known

    if not GEMINI_API_KEY or not github_token:
        return "라이선스를 자동으로 파악하지 못했어요. 사용 전 GitHub 레포의 LICENSE 파일을 직접 확인해 주세요."

    license_text = fetch_github_license_file(owner, repo_name, github_token)
    if not license_text:
        return (
            "라이선스 파일을 찾을 수 없어요. 사용 전 GitHub 레포를 직접 확인해 주세요."
        )

    explanation = _explain_license_with_gemini(
        license_text,
        repo_title,
        api_key=GEMINI_API_KEY,
        model=GEMINI_MODEL,
    )
    if explanation:
        return explanation
    return "라이선스를 자동으로 파악하지 못했어요. 사용 전 GitHub 레포의 LICENSE 파일을 직접 확인해 주세요."


def serialize_curated_content(row: Mapping[str, object]) -> dict[str, object]:
    raw_review_metadata = row.get("review_metadata")
    review_metadata = (
        cast(dict[str, object], raw_review_metadata)
        if isinstance(raw_review_metadata, dict)
        else {}
    )
    return {
        "id": safe_int(row.get("id"), 0),
        "source_type": str(row.get("source_type") or "github"),
        "source_url": str(row.get("source_url") or ""),
        "canonical_url": str(row.get("canonical_url") or ""),
        "repo_name": str(row.get("repo_name") or ""),
        "repo_owner": str(row.get("repo_owner") or ""),
        "title": str(row.get("title") or ""),
        "category": str(row.get("category") or ""),
        "language": str(row.get("language") or ""),
        "is_korean_dev": bool(row.get("is_korean_dev") or False),
        "stars": safe_int(row.get("stars"), 0),
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
    base_item: Mapping[str, object],
    candidate: Mapping[str, object],
    now_ms: int,
    recent_click_count: int = 0,
    click_boost_min_relevance: int = CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE,
    click_boost_multiplier: int = CURATED_RELATED_CLICK_BOOST_MULTIPLIER,
    click_boost_cap: int = CURATED_RELATED_CLICK_BOOST_CAP,
) -> tuple[int, CuratedRelatedListItem]:
    current_tag_set = set(_normalized_curated_tags(base_item))
    candidate_tag_set = set(_normalized_curated_tags(candidate))
    overlap_count = len(current_tag_set & candidate_tag_set)
    quality = safe_int(candidate.get("quality_score"), 0)
    relevance = safe_int(candidate.get("relevance_score"), 0)
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
        or overlap_count >= CURATED_RELATED_CLICK_BOOST_MIN_TAG_OVERLAP
    )

    reason_codes: list[str] = []
    if overlap_count > 0:
        reason_codes.append(CURATED_REASON_TAG_OVERLAP)
    if freshness >= 20:
        reason_codes.append(CURATED_REASON_RECENT_UPDATE)
    if quality >= 8:
        reason_codes.append(CURATED_REASON_HIGH_QUALITY)
    if language_match > 0:
        reason_codes.append(CURATED_REASON_LANGUAGE_MATCH)
    if korean_match > 0:
        reason_codes.append(CURATED_REASON_KOREAN_DEV_MATCH)
    if not reason_codes:
        reason_codes.append(
            CURATED_REASON_CATEGORY_MATCH
            if category_match > 0
            else CURATED_REASON_CONTEXTUAL_MATCH
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
        "item": serialize_curated_content(candidate),
        "reasons": [
            {
                "code": code,
                "label": format_curated_reason_label(
                    code,
                    overlap_count=overlap_count,
                    language=base_language if language_match > 0 else None,
                ),
            }
            for code in reason_codes
        ],
    }


def _collect_curated_related_candidates(
    base_item: Mapping[str, object],
    limit: int,
) -> list[CuratedRelatedListItem]:
    global _last_curated_related_click_fallback_warning_at
    safe_limit = max(1, min(limit, 8))
    sample_limit = max(24, safe_limit * 8)
    category = str(base_item.get("category") or "").strip() or None

    candidate_rows: list[Mapping[str, object]] = []
    if category:
        candidate_rows.extend(
            cast(
                list[Mapping[str, object]],
                list_curated_content(
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
                list_curated_content(
                    status="approved",
                    sort="latest",
                    limit=sample_limit,
                    offset=0,
                ),
            )
        )

    base_id = safe_int(base_item.get("id"), 0)
    moderation_settings = get_moderation_settings() or {}
    click_boost_min_relevance = normalize_positive_int(
        moderation_settings.get("curated_related_click_boost_min_relevance"),
        DEFAULT_CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE,
        minimum=1,
        maximum=100,
    )
    click_boost_multiplier = normalize_positive_int(
        moderation_settings.get("curated_related_click_boost_multiplier"),
        DEFAULT_CURATED_RELATED_CLICK_BOOST_MULTIPLIER,
        minimum=1,
        maximum=200,
    )
    click_boost_cap = normalize_positive_int(
        moderation_settings.get("curated_related_click_boost_cap"),
        DEFAULT_CURATED_RELATED_CLICK_BOOST_CAP,
        minimum=1,
        maximum=500,
    )
    seen_ids: set[int] = set()
    scored: list[tuple[int, CuratedRelatedListItem]] = []
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    try:
        click_counts = get_curated_related_click_counts_for_source(
            base_id,
            CURATED_RELATED_CLICK_BOOST_WINDOW_DAYS,
        )
    except Exception as exc:
        now_monotonic = time.monotonic()
        if (
            now_monotonic - _last_curated_related_click_fallback_warning_at
            >= CURATED_RELATED_CLICK_FALLBACK_LOG_WINDOW_SECONDS
        ):
            logger.warning(
                "curated related click-count fallback used: source_id=%s window_days=%s error=%s",
                base_id,
                CURATED_RELATED_CLICK_BOOST_WINDOW_DAYS,
                exc,
            )
            _last_curated_related_click_fallback_warning_at = now_monotonic
        click_counts = {}

    for candidate in candidate_rows:
        candidate_id = safe_int(candidate.get("id"), 0)
        if candidate_id <= 0 or candidate_id == base_id or candidate_id in seen_ids:
            continue
        seen_ids.add(candidate_id)
        scored.append(
            _build_curated_related_entry(
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
            safe_int(entry[1]["item"].get("quality_score"), 0),
            safe_int(entry[1]["item"].get("relevance_score"), 0),
            safe_int(entry[1]["item"].get("stars"), 0),
        ),
        reverse=True,
    )
    return [entry[1] for entry in scored[:safe_limit]]


@app.get("/api/curated")
def list_curated_endpoint(
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_korean_dev: Optional[bool] = None,
    sort: str = "latest",
    limit: int = 20,
    offset: int = 0,
):
    curated_items = list_curated_content(
        status="approved",
        category=category,
        search=search,
        is_korean_dev=is_korean_dev,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    total = get_curated_content_count(
        status="approved",
        category=category,
        search=search,
        is_korean_dev=is_korean_dev,
    )
    return {
        "items": [serialize_curated_content(item) for item in curated_items],
        "total": total,
        "next_cursor": None,
    }


@app.get("/api/curated/{content_id}")
def get_curated_detail_endpoint(content_id: int):
    item = get_curated_content_by_id(content_id)
    if not item or str(item.get("status") or "") != "approved":
        raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다")
    return serialize_curated_content(item)


@app.get("/api/curated/{content_id}/related")
def get_curated_related_endpoint(content_id: int, limit: int = 4):
    item = get_curated_content_by_id(content_id)
    if not item or str(item.get("status") or "") != "approved":
        raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다")

    return {
        "items": _collect_curated_related_candidates(item, limit),
        "source": "server",
    }


@app.post("/api/curated/related-clicks")
def create_curated_related_click_endpoint(
    payload: CuratedRelatedClickCreate,
    request: Request,
):
    source_id = safe_int(payload.source_content_id, 0)
    target_id = safe_int(payload.target_content_id, 0)

    if source_id <= 0 or target_id <= 0:
        raise HTTPException(status_code=400, detail="유효하지 않은 콘텐츠 ID입니다")
    if source_id == target_id:
        raise HTTPException(
            status_code=400, detail="동일 콘텐츠 클릭은 기록할 수 없습니다"
        )

    client_ip = _extract_client_ip(request)
    enforce_rate_limit(
        "curated_related_click_ip",
        client_ip,
        limit=CURATED_RELATED_CLICK_IP_LIMIT_PER_MINUTE,
        window_seconds=60.0,
        detail="요청이 너무 많습니다. 잠시 후 다시 시도해 주세요",
    )
    dedupe_key = f"{client_ip}:{source_id}:{target_id}"
    try:
        enforce_rate_limit(
            "curated_related_click_pair",
            dedupe_key,
            limit=1,
            window_seconds=CURATED_RELATED_CLICK_DEDUPE_WINDOW_SECONDS,
            detail="duplicate curated related click",
        )
    except HTTPException as exc:
        if exc.status_code == 429:
            return {"ok": True, "id": 0}
        raise

    source_item = get_curated_content_by_id(source_id)
    target_item = get_curated_content_by_id(target_id)
    if not source_item or str(source_item.get("status") or "") != "approved":
        raise HTTPException(status_code=404, detail="기준 콘텐츠를 찾을 수 없습니다")
    if not target_item or str(target_item.get("status") or "") != "approved":
        raise HTTPException(status_code=404, detail="대상 콘텐츠를 찾을 수 없습니다")

    normalized_reason_code = normalize_curated_reason_code(
        payload.reason_code or payload.reason
    )
    if normalized_reason_code == CURATED_REASON_UNKNOWN and (
        payload.reason or payload.reason_code
    ):
        normalized_reason_code = CURATED_REASON_CONTEXTUAL_MATCH

    saved = create_curated_related_click(
        source_content_id=source_id,
        target_content_id=target_id,
        reason_code=normalized_reason_code,
        reason=get_curated_reason_label(normalized_reason_code),
        client_ip=client_ip,
    )
    saved_id = safe_int(saved.get("id") if saved else None, 0)
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
    _ = require_admin_from_request(request)
    items = list_admin_curated_content(status=status, limit=limit, offset=offset)
    total = get_admin_curated_content_count(status=status)
    return {
        "items": [serialize_curated_content(item) for item in items],
        "total": total,
        "next_cursor": None,
    }


@app.patch("/api/admin/curated/{content_id}")
def update_admin_curated_endpoint(
    content_id: int,
    payload: CuratedAdminUpdateRequest,
    request: Request,
):
    current_user = require_admin_from_request(request)
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="변경할 필드가 없습니다")

    if updates.get("status") == "approved":
        updates["approved_by"] = current_user["id"]
        if "reject_reason" not in updates:
            updates["reject_reason"] = None

    updated = update_curated_content_admin(content_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다")
    return serialize_curated_content(updated)


@app.post("/api/admin/curated/run")
def run_curated_collection_endpoint(
    request: Request,
):
    _ = require_admin_from_request(request)

    return perform_curated_collection_run(allow_sample_fallback=True)


def perform_curated_collection_run(
    *, allow_sample_fallback: bool = True
) -> dict[str, object]:

    config = GitHubCollectorConfig(
        search_topics=GITHUB_SEARCH_TOPICS,
        min_stars=GITHUB_MIN_STARS,
        daily_collect_limit=DAILY_COLLECT_LIMIT,
    )
    _ = build_search_query(config)

    existing = list_admin_curated_content(status=None, limit=500, offset=0)
    moderation_settings = get_effective_moderation_settings()
    quality_review_threshold = cast(
        int,
        moderation_settings.get(
            "curated_review_quality_threshold",
            DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD,
        ),
    )
    today = datetime.now(timezone.utc).date()
    collected_today = sum(
        1
        for row in existing
        if str(row.get("collected_at") or "").startswith(str(today))
    )

    if reached_daily_collect_limit(collected_today, config):
        return {
            "created": 0,
            "message": "오늘 수집 한도에 도달했습니다",
            "daily_limit": config.daily_collect_limit,
            "collected_today": collected_today,
        }

    candidates, collection_message = _load_curated_collection_candidates(
        config,
        allow_sample_fallback=allow_sample_fallback,
    )

    created_count = 0
    processed_candidates: list[dict[str, object]] = []
    for repo in candidates:
        if reached_daily_collect_limit(collected_today + created_count, config):
            break

        summary = ThreeLevelSummary(
            beginner=str(repo.get("summary_beginner") or "").strip(),
            mid=str(repo.get("summary_mid") or "").strip(),
            expert=str(repo.get("summary_expert") or "").strip(),
        )
        if (
            not summary.beginner.strip()
            or not summary.mid.strip()
            or not summary.expert.strip()
        ):
            summary = summarize_repository_without_llm(repo)
        if (
            not summary.beginner.strip()
            or not summary.mid.strip()
            or not summary.expert.strip()
        ):
            summary = fallback_summary_template(str(repo.get("title") or "GitHub Repo"))
        quality_score = calc_quality_score(
            QualityInputs(
                stars=safe_int(repo.get("stars"), 0),
                is_korean_dev=bool(repo.get("is_korean_dev") or False),
                has_readme=bool(repo.get("has_readme") or False),
                relevance_score=safe_int(repo.get("relevance_score"), 0),
                beginner_value=safe_int(repo.get("beginner_value"), 0),
            )
        )
        status = determine_curated_collection_status(
            repo,
            quality_score,
            quality_threshold=quality_review_threshold,
            existing_items=existing,
            processed_items=processed_candidates,
        )
        review_metadata = build_curated_review_metadata(
            repo,
            quality_score,
            quality_threshold=quality_review_threshold,
            existing_items=existing,
            processed_items=processed_candidates,
        )

        payload = {
            **repo,
            "summary_beginner": summary.beginner,
            "summary_mid": summary.mid,
            "summary_expert": summary.expert,
            "quality_score": quality_score,
            "status": status,
            "reject_reason": (
                "auto_cutoff" if status == CURATED_STATUS_AUTO_REJECTED else None
            ),
            "review_metadata": (
                review_metadata if status in CURATED_REVIEW_QUEUE_STATUSES else {}
            ),
            "github_pushed_at": repo.get("github_pushed_at")
            or datetime.now(timezone.utc),
        }
        saved = create_or_update_curated_content(payload)
        processed_candidates.append(payload)
        if saved and bool(saved.get("inserted", False)):
            created_count += 1

    return {
        "created": created_count,
        "daily_limit": config.daily_collect_limit,
        "collected_today": collected_today + created_count,
        **({"message": collection_message} if collection_message else {}),
    }


def _load_curated_collection_candidates(
    config: GitHubCollectorConfig,
    *,
    allow_sample_fallback: bool,
) -> tuple[list[dict[str, object]], str | None]:
    if not GITHUB_TOKEN:
        if not allow_sample_fallback:
            return [], "GITHUB_TOKEN이 없어 자동 수집을 건너뛰었습니다"
        return (
            _build_sample_curated_candidates(),
            "GITHUB_TOKEN이 없어 개발용 샘플 후보로 대체했습니다",
        )

    search_results = search_github_repositories(config, GITHUB_TOKEN, per_page=20)
    if not search_results:
        return [], "GitHub 검색 결과가 없어 새 후보를 만들지 못했습니다"

    candidates: list[dict[str, object]] = []
    for repo in search_results:
        readme_excerpt = ""
        if repo["has_readme"]:
            readme_excerpt = fetch_github_readme_excerpt(
                repo["owner"],
                repo["name"],
                GITHUB_TOKEN,
                max_chars=GITHUB_README_EXCERPT_MAX_CHARS,
            )
        repo_title = _humanize_repo_title(repo["name"])
        license_explanation = generate_license_explanation(
            repo["license"],
            repo["owner"],
            repo["name"],
            repo_title,
            GITHUB_TOKEN,
        )
        candidate_seed = {
            "source_type": "github",
            "source_url": repo["source_url"],
            "canonical_url": repo["canonical_url"],
            "repo_name": repo["name"],
            "repo_owner": repo["owner"],
            "title": repo_title,
            "language": repo["language"],
            "is_korean_dev": repo["is_korean_dev"],
            "stars": repo["stars"],
            "license": repo["license"],
            "license_explanation": license_explanation,
            "has_readme": repo["has_readme"],
            "github_pushed_at": repo["github_pushed_at"],
            "description": repo["description"],
            "readme_excerpt": readme_excerpt,
        }
        evaluation, summary = _build_curated_candidate_intelligence(candidate_seed)
        candidates.append(
            {
                **candidate_seed,
                "category": evaluation.category,
                "relevance_score": evaluation.relevance_score,
                "beginner_value": evaluation.beginner_value,
                "tags": evaluation.tags,
                "reason": evaluation.reason,
                "summary_beginner": summary.beginner,
                "summary_mid": summary.mid,
                "summary_expert": summary.expert,
            }
        )
    return candidates, None


def _build_sample_curated_candidates() -> list[dict[str, object]]:
    return [
        {
            "source_type": "github",
            "source_url": "https://github.com/example/claude-mcp-starter",
            "canonical_url": normalize_github_repo_url(
                "https://github.com/example/claude-mcp-starter.git"
            ),
            "repo_name": "claude-mcp-starter",
            "repo_owner": "example",
            "title": "Claude MCP Starter",
            "category": "tool",
            "language": "TypeScript",
            "is_korean_dev": True,
            "stars": 420,
            "license": "MIT",
            "relevance_score": 8,
            "beginner_value": 8,
            "tags": ["MCP", "Claude", "Starter"],
            "has_readme": True,
            "description": "Claude와 MCP 기반 바이브코딩 흐름을 바로 시작할 수 있는 스타터 키트입니다.",
        },
        {
            "source_type": "github",
            "source_url": "https://github.com/example/vibe-template-kit",
            "canonical_url": normalize_github_repo_url(
                "https://github.com/example/vibe-template-kit"
            ),
            "repo_name": "vibe-template-kit",
            "repo_owner": "example",
            "title": "Vibe Template Kit",
            "category": "template",
            "language": "JavaScript",
            "is_korean_dev": False,
            "stars": 190,
            "license": "Apache-2.0",
            "relevance_score": 7,
            "beginner_value": 7,
            "tags": ["Template", "VibeCoding"],
            "has_readme": True,
            "description": "반복 설정 없이 바로 실행하고 수정해볼 수 있는 템플릿 모음입니다.",
        },
    ]


def _humanize_repo_title(repo_name: str) -> str:
    words = [part for part in re.split(r"[-_]+", repo_name.strip()) if part]
    if not words:
        return repo_name
    return " ".join(
        word.upper() if word.isupper() else word.capitalize() for word in words
    )


def _build_curated_candidate_intelligence(
    candidate: Mapping[str, object],
) -> tuple[CurationEvaluation, ThreeLevelSummary]:
    heuristic_evaluation = heuristic_curation_evaluation(candidate)
    heuristic_summary = summarize_repository_without_llm(
        {**candidate, "category": heuristic_evaluation.category}
    )
    if not GEMINI_API_KEY:
        return heuristic_evaluation, heuristic_summary

    try:
        gemini_result = curate_repository_with_gemini(
            {**candidate, "category": heuristic_evaluation.category},
            GEMINI_API_KEY,
            model=GEMINI_MODEL,
        )
    except RuntimeError:
        return heuristic_evaluation, heuristic_summary

    summary = gemini_result.summary
    if (
        not summary.beginner.strip()
        or not summary.mid.strip()
        or not summary.expert.strip()
    ):
        summary = heuristic_summary
    return gemini_result.evaluation, summary


def determine_curated_collection_status(
    repo: Mapping[str, object],
    quality_score: int,
    *,
    quality_threshold: int = DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD,
    existing_items: Sequence[Mapping[str, object]] | None = None,
    processed_items: Sequence[Mapping[str, object]] | None = None,
) -> str:
    relevance_score = safe_int(repo.get("relevance_score"), 0)
    if should_auto_reject(quality_score, relevance_score):
        return CURATED_STATUS_AUTO_REJECTED

    if is_curated_duplicate_candidate(
        repo,
        existing_items=existing_items,
        processed_items=processed_items,
    ):
        return CURATED_STATUS_REVIEW_DUPLICATE

    license_value = str(repo.get("license") or "").strip().lower()
    if not license_value or license_value in {"unknown", "noassertion", "other"}:
        return CURATED_STATUS_REVIEW_LICENSE

    if quality_score < quality_threshold:
        return CURATED_STATUS_REVIEW_QUALITY

    return CURATED_STATUS_PENDING


def is_curated_duplicate_candidate(
    repo: Mapping[str, object],
    *,
    existing_items: Sequence[Mapping[str, object]] | None = None,
    processed_items: Sequence[Mapping[str, object]] | None = None,
) -> bool:
    return bool(
        build_curated_duplicate_review_metadata(
            repo,
            existing_items=existing_items,
            processed_items=processed_items,
        )
    )


def build_curated_review_metadata(
    repo: Mapping[str, object],
    quality_score: int,
    *,
    quality_threshold: int = DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD,
    existing_items: Sequence[Mapping[str, object]] | None = None,
    processed_items: Sequence[Mapping[str, object]] | None = None,
) -> CuratedDuplicateReviewMetadata:
    duplicate_metadata = build_curated_duplicate_review_metadata(
        repo,
        existing_items=existing_items,
        processed_items=processed_items,
    )
    if duplicate_metadata:
        return duplicate_metadata

    license_value = str(repo.get("license") or "").strip()
    normalized_license = license_value.lower()
    if not normalized_license:
        return {
            "reason_codes": ["license_missing"],
            "license_value": license_value,
        }
    if normalized_license in {"unknown", "noassertion", "other"}:
        return {
            "reason_codes": ["license_unrecognized"],
            "license_value": license_value,
        }

    if quality_score < quality_threshold:
        return {
            "reason_codes": ["quality_below_threshold"],
            "quality_score_value": quality_score,
            "quality_threshold": quality_threshold,
        }

    return {}


def build_curated_duplicate_review_metadata(
    repo: Mapping[str, object],
    *,
    existing_items: Sequence[Mapping[str, object]] | None = None,
    processed_items: Sequence[Mapping[str, object]] | None = None,
) -> CuratedDuplicateReviewMetadata:
    candidate_canonical = normalize_github_repo_url(
        str(repo.get("canonical_url") or "").strip()
    )
    candidate_repo_name = str(repo.get("repo_name") or "").strip().lower()
    candidate_repo_owner = str(repo.get("repo_owner") or "").strip().lower()
    candidate_title = _normalize_curated_title(str(repo.get("title") or ""))

    comparison_pool = list(existing_items or []) + list(processed_items or [])
    review_metadata: CuratedDuplicateReviewMetadata = {"reason_codes": []}
    matched_existing_ids: list[int] = []
    matched_processed_titles: list[str] = []
    for item in comparison_pool:
        item_id = safe_int(item.get("id"), 0)
        repo_id = safe_int(repo.get("id"), 0)
        if repo_id > 0 and item_id == repo_id:
            continue

        matched = False

        existing_canonical = normalize_github_repo_url(
            str(item.get("canonical_url") or "").strip()
        )
        if (
            candidate_canonical
            and existing_canonical
            and candidate_canonical == existing_canonical
        ):
            review_metadata["canonical_url_match"] = True
            review_metadata["reason_codes"].append("canonical_url_match")
            matched = True

        existing_repo_name = str(item.get("repo_name") or "").strip().lower()
        existing_repo_owner = str(item.get("repo_owner") or "").strip().lower()
        if (
            candidate_repo_name
            and candidate_repo_owner
            and candidate_repo_name == existing_repo_name
            and candidate_repo_owner == existing_repo_owner
        ):
            review_metadata["owner_repo_match"] = True
            review_metadata["reason_codes"].append("owner_repo_match")
            matched = True

        existing_title = _normalize_curated_title(str(item.get("title") or ""))
        if candidate_title and existing_title and candidate_title == existing_title:
            review_metadata["title_match"] = True
            review_metadata["reason_codes"].append("title_match")
            matched = True

        if matched:
            if item_id > 0:
                matched_existing_ids.append(item_id)
            else:
                processed_title = str(item.get("title") or "").strip()
                if processed_title:
                    matched_processed_titles.append(processed_title)

    if matched_existing_ids:
        review_metadata["matched_existing_ids"] = sorted(set(matched_existing_ids))
    if matched_processed_titles:
        review_metadata["matched_processed_titles"] = sorted(
            set(matched_processed_titles)
        )

    reason_codes = sorted(set(review_metadata.get("reason_codes") or []))
    if reason_codes:
        review_metadata["reason_codes"] = reason_codes
    else:
        review_metadata.pop("reason_codes", None)

    return review_metadata


def _normalize_curated_title(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", " ", value.strip().lower())
    return " ".join(part for part in normalized.split() if part)


@app.get("/api/admin/curated/related-clicks/summary")
def get_admin_curated_related_clicks_summary_endpoint(
    request: Request,
    days: int = 30,
    limit: int = 5,
    source_content_id: Optional[int] = None,
):
    _ = require_admin_from_request(request)
    return get_curated_related_click_summary(
        days=days,
        limit=limit,
        source_content_id=source_content_id,
    )


@app.delete("/api/admin/curated/{content_id}")
def delete_admin_curated_endpoint(
    content_id: int,
    request: Request,
):
    _ = require_admin_from_request(request)
    deleted = delete_curated_content(content_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다")
    return {"deleted": True, "id": content_id}


@app.post("/api/error-translate")
def error_translate_endpoint(payload: ErrorTranslateRequest, request: Request):
    client_ip = _extract_client_ip(request)
    enforce_rate_limit(
        "error_translate_ip",
        client_ip,
        limit=ERROR_TRANSLATE_IP_LIMIT_PER_MINUTE,
        window_seconds=60.0,
        detail="요청이 너무 많습니다. 잠시 후 다시 시도해 주세요",
    )

    message = payload.error_message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="에러 메시지를 입력해 주세요")
    if len(message) > 2000:
        raise HTTPException(
            status_code=400, detail="에러 메시지는 2000자 이하로 입력해 주세요"
        )

    normalized = message
    if contains_prompt_injection(normalized):
        normalized = "[prompt-injection-filtered] " + normalized

    error_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    cached = get_error_solution(error_hash)
    if cached:
        solution = cast(dict[str, object], cached.get("solution") or {})
        solution["error_hash"] = error_hash
        solution["source"] = "cache"
        return solution

    solution = build_error_solution_fallback(message)
    saved = upsert_error_solution(
        error_hash=error_hash,
        error_type=str(solution.get("error_type") or "general"),
        error_excerpt=message[:200],
        solution=solution,
    )
    _ = saved
    solution["error_hash"] = error_hash
    solution["source"] = "fallback"
    return solution


@app.post("/api/error-translate/feedback")
def error_translate_feedback_endpoint(payload: ErrorTranslateFeedbackRequest):
    updated = increment_error_solution_feedback(
        error_hash=payload.error_hash,
        solved=payload.solved,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="해당 에러 기록을 찾을 수 없습니다")
    return {"ok": True}


@app.post("/api/translate")
def text_translate_endpoint(payload: TextTranslateRequest, request: Request):
    client_ip = _extract_client_ip(request)
    enforce_rate_limit(
        "text_translate_ip",
        client_ip,
        limit=TEXT_TRANSLATE_IP_LIMIT_PER_MINUTE,
        window_seconds=60.0,
        detail="요청이 너무 많습니다. 잠시 후 다시 시도해 주세요",
    )

    input_text = payload.input_text.strip()
    if not input_text:
        raise HTTPException(status_code=400, detail="번역할 텍스트를 입력해 주세요")
    if len(input_text) > 2000:
        raise HTTPException(
            status_code=400, detail="번역 텍스트는 2000자 이하로 입력해 주세요"
        )

    normalized = input_text
    if contains_prompt_injection(normalized):
        normalized = "[prompt-injection-filtered] " + normalized

    input_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    cached = get_text_translation(input_hash)
    if cached:
        translation = cast(dict[str, object], cached.get("translation") or {})
        translation["input_hash"] = input_hash
        translation["source"] = "cache"
        return translation

    if GEMINI_API_KEY:
        try:
            translation = translate_text_with_gemini(
                input_text,
                api_key=GEMINI_API_KEY,
                model=GEMINI_MODEL,
            )
            source = "gemini"
        except RuntimeError:
            translation = build_text_translation_fallback(input_text)
            source = "fallback"
    else:
        translation = build_text_translation_fallback(input_text)
        source = "fallback"

    saved = upsert_text_translation(
        input_hash=input_hash,
        input_excerpt=input_text[:200],
        translation=translation,
    )
    _ = saved
    translation["input_hash"] = input_hash
    translation["source"] = source
    return translation


@app.post("/api/glossary/term-requests")
def create_glossary_term_request_endpoint(
    payload: GlossaryTermRequestCreate,
    request: Request,
):
    client_ip = _extract_client_ip(request)
    enforce_rate_limit(
        "glossary_term_request_ip",
        client_ip,
        limit=GLOSSARY_TERM_REQUEST_IP_LIMIT_PER_HOUR,
        window_seconds=60.0 * 60.0,
        detail="용어 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요",
    )

    requested_term = payload.requested_term.strip()
    if len(requested_term) < 2:
        raise HTTPException(status_code=400, detail="용어는 2자 이상 입력해 주세요")
    if len(requested_term) > 80:
        raise HTTPException(status_code=400, detail="용어는 80자 이하로 입력해 주세요")

    saved = create_glossary_term_request(
        requested_term=requested_term,
        context_note=(payload.context_note or "").strip() or None,
        requester_ip=client_ip,
        requester_id=None,
    )
    return {
        "id": safe_int(saved.get("id"), 0),
        "requested_term": str(saved.get("requested_term") or ""),
        "status": str(saved.get("status") or "pending"),
        "created_at": str(saved.get("created_at") or ""),
    }


# ============ Projects API ============


@app.get("/api/projects")
def list_projects(
    sort: str = "latest",
    platform: Optional[str] = None,
    tag: Optional[str] = None,
):
    """프로젝트 목록 조회"""
    request_started = time.perf_counter()
    normalized_sort = "popular" if sort == "popular" else "latest"
    try:
        cached_items = _get_cached_projects(
            sort=normalized_sort, platform=platform, tag=tag
        )
        if cached_items is not None:
            for p in cached_items:
                p["id"] = str(p["id"])
                p["author_id"] = str(p["author_id"])
            elapsed_ms = (time.perf_counter() - request_started) * 1000
            _record_project_perf(elapsed_ms=elapsed_ms, db_ms=0.0, cache_hit=True)
            print(
                f"[perf] /api/projects cache_hit=1 sort={normalized_sort} platform={platform} tag={tag} elapsed_ms={elapsed_ms:.2f}"
            )
            return {"items": cached_items, "next_cursor": None}

        db_started = time.perf_counter()
        projects = get_projects(sort=normalized_sort, platform=platform, tag=tag)
        db_ms = (time.perf_counter() - db_started) * 1000
        _set_cached_projects(
            sort=normalized_sort, platform=platform, tag=tag, items=projects
        )
        # UUID를 문자열로 변환
        for p in projects:
            p["id"] = str(p["id"])
            p["author_id"] = str(p["author_id"])
        elapsed_ms = (time.perf_counter() - request_started) * 1000
        _record_project_perf(elapsed_ms=elapsed_ms, db_ms=db_ms, cache_hit=False)
        print(
            f"[perf] /api/projects cache_hit=0 sort={normalized_sort} platform={platform} tag={tag} db_ms={db_ms:.2f} elapsed_ms={elapsed_ms:.2f}"
        )
        return {"items": projects, "next_cursor": None}
    except Exception as e:
        print(f"Error fetching projects: {e}")
        return {"items": [], "next_cursor": None}


@app.get("/api/projects/{project_id}")
def get_project_detail(project_id: str):
    """프로젝트 상세 조회"""
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("status") != "published":
        raise HTTPException(status_code=404, detail="Project not found")
    project["id"] = str(project["id"])
    project["author_id"] = str(project["author_id"])
    return project


# ============ Comments API ============


@app.get("/api/projects/{project_id}/comments")
def list_comments(project_id: str, sort: str = "latest"):
    """프로젝트 댓글 목록 조회"""
    comments = get_comments(project_id, sort=sort)
    for c in comments:
        c["id"] = str(c["id"])
        c["project_id"] = str(c["project_id"])
        c["author_id"] = str(c["author_id"])
        if c.get("parent_id"):
            c["parent_id"] = str(c["parent_id"])
    return {"items": comments, "next_cursor": None}


# ============ Reports API ============


@app.post("/api/comments/{comment_id}/report")
def report_comment_endpoint(comment_id: str, report: ReportCreate):
    """댓글 신고"""
    new_report = report_comment(
        comment_id=comment_id, reason=report.reason, memo=report.memo
    )
    if not new_report:
        raise HTTPException(status_code=500, detail="신고 생성에 실패했습니다")
    new_report["id"] = str(new_report["id"])
    if new_report.get("reporter_id"):
        new_report["reporter_id"] = str(new_report["reporter_id"])
    return new_report


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    user = ensure_bootstrap_super_admin(user)

    status_raw = user.get("status")
    user_status = status_raw if isinstance(status_raw, str) and status_raw else "active"
    if user_status != "active":
        raise HTTPException(
            status_code=403, detail=get_blocked_user_message(user_status)
        )

    token_version_claim = payload.get("sv")
    token_version_from_claim = (
        token_version_claim if isinstance(token_version_claim, int) else 0
    )
    user_token_version = user.get("token_version")
    current_token_version = (
        user_token_version if isinstance(user_token_version, int) else 0
    )
    if token_version_from_claim != current_token_version:
        raise HTTPException(
            status_code=401, detail="세션이 만료되었습니다. 다시 로그인해 주세요"
        )

    return {
        "id": str(user["id"]),
        "email": str(user["email"]),
        "nickname": str(user["nickname"]),
        "role": str(user["role"]),
        "status": user_status,
        "avatar_url": cast(Optional[str], user.get("avatar_url")),
        "bio": cast(Optional[str], user.get("bio")),
    }


@app.post("/api/projects/{project_id}/like")
def like_project_endpoint(
    project_id: str,
    current_user: UserContext = Depends(get_current_user),
):
    try:
        like_count = like_project(project_id, current_user["id"])
        _invalidate_projects_cache()
        return {"like_count": like_count}
    except Exception:
        raise HTTPException(status_code=404, detail="Project not found")


@app.delete("/api/projects/{project_id}/like")
def unlike_project_endpoint(
    project_id: str,
    current_user: UserContext = Depends(get_current_user),
):
    try:
        like_count = unlike_project(project_id, current_user["id"])
        _invalidate_projects_cache()
        return {"like_count": like_count}
    except Exception:
        raise HTTPException(status_code=404, detail="Project not found")


async def require_admin(current_user: UserContext = Depends(get_current_user)):
    if current_user.get("role") not in ADMIN_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return current_user


async def require_super_admin(current_user: UserContext = Depends(get_current_user)):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="슈퍼 관리자 권한이 필요합니다")
    return current_user


def enforce_page_editor_rollout_access(current_user: UserContext) -> None:
    settings = get_effective_moderation_settings()
    if not bool(settings.get("page_editor_enabled", True)):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "page_editor_disabled",
                "message": "페이지 편집 기능이 현재 비활성화되어 있습니다",
            },
        )

    stage = normalize_rollout_stage(
        settings.get("page_editor_rollout_stage"),
        DEFAULT_PAGE_EDITOR_ROLLOUT_STAGE,
    )
    role = str(current_user.get("role") or "")
    if role == "super_admin":
        return

    if stage == "open":
        return

    if stage == "qa":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "page_editor_stage_qa_only",
                "message": "현재 내부 QA 단계로 super_admin만 접근할 수 있습니다",
            },
        )

    pilot_ids = {
        str(admin_id).strip()
        for admin_id in cast(list[str], settings.get("page_editor_pilot_admin_ids", []))
        if str(admin_id).strip()
    }
    if str(current_user.get("id") or "") not in pilot_ids:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "page_editor_stage_pilot_only",
                "message": "현재 파일럿 단계로 지정된 운영자만 접근할 수 있습니다",
            },
        )


@app.patch("/api/projects/{project_id}")
def update_project_endpoint(
    project_id: str,
    payload: ProjectUpdateRequest,
    current_user: UserContext = Depends(get_current_user),
):
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")

    is_admin = current_user.get("role") in ADMIN_ALLOWED_ROLES
    is_owner = str(existing.get("author_id")) == current_user.get("id")
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다")

    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="변경할 프로젝트 필드가 없습니다")

    content_for_check = " ".join(
        [
            updates.get("title", existing.get("title", "")) or "",
            updates.get("summary", existing.get("summary", "")) or "",
            updates.get("description", existing.get("description", "")) or "",
        ]
    )
    settings = get_effective_moderation_settings()
    blocked_keywords = cast(list[str], settings["blocked_keywords"])
    if text_contains_blocked_keyword(content_for_check, blocked_keywords):
        raise HTTPException(
            status_code=400, detail="금칙어가 포함된 내용은 수정할 수 없습니다"
        )

    updated = update_project_owner_fields(project_id, updates)
    if not updated:
        raise HTTPException(status_code=500, detail="프로젝트 수정에 실패했습니다")

    _invalidate_projects_cache()
    updated["id"] = str(updated["id"])
    updated["author_id"] = str(updated["author_id"])
    return updated


# ============ Admin API ============


@app.get("/api/admin/reports")
def list_reports(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: UserContext = Depends(require_admin),
):
    """신고 목록 조회 (관리자)"""
    _ = current_user
    reports = get_reports(status=status, limit=limit, offset=offset)
    total = get_reports_count(status=status)
    for r in reports:
        r["id"] = str(r["id"])
        if r.get("reporter_id"):
            r["reporter_id"] = str(r["reporter_id"])
    return {"items": reports, "total": total, "next_cursor": None}


@app.get("/api/admin/perf/projects")
def get_projects_perf(current_user: UserContext = Depends(require_admin)):
    _ = current_user
    return _project_perf_snapshot()


@app.get("/api/admin/perf/page-editor")
def get_page_editor_perf(current_user: UserContext = Depends(require_admin)):
    _ = current_user
    return _page_editor_perf_snapshot()


@app.post("/api/admin/perf/page-editor/events")
def create_page_editor_perf_event(
    payload: AdminPagePerfEventRequest,
    current_user: UserContext = Depends(require_admin),
):
    duration_ms = max(0.0, min(float(payload.durationMs), 120000.0))
    scenario = payload.scenario
    if scenario not in PAGE_EDITOR_PERF_SCENARIOS:
        raise HTTPException(status_code=400, detail="지원하지 않는 성능 시나리오입니다")

    _record_page_editor_perf(
        scenario=scenario,
        duration_ms=duration_ms,
        source=payload.source,
    )
    source = (payload.source or "ui").strip() or "ui"
    write_admin_action_log(
        admin_id=current_user["id"],
        action_type=f"page_perf_{scenario}",
        target_type="page",
        target_id=page_action_target_id(payload.pageId),
        reason=f"duration_ms={duration_ms:.2f}; source={source}",
    )
    return {"ok": True}


@app.get("/api/admin/stats")
def get_admin_stats_endpoint(current_user: UserContext = Depends(require_admin)):
    _ = current_user
    return get_admin_stats()


@app.get("/api/admin/integrations/oauth")
def get_admin_oauth_settings(current_user: UserContext = Depends(require_admin)):
    _ = current_user
    settings = get_effective_oauth_settings()
    return {
        "google_oauth_enabled": settings["google_oauth_enabled"],
        "google_redirect_uri": settings["google_redirect_uri"],
        "google_frontend_redirect_uri": settings["google_frontend_redirect_uri"],
    }


@app.patch("/api/admin/integrations/oauth")
def update_admin_oauth_settings(
    payload: AdminOAuthSettingsUpdateRequest,
    current_user: UserContext = Depends(require_admin),
):
    google_redirect_uri = (payload.google_redirect_uri or "").strip() or None
    google_frontend_redirect_uri = (
        payload.google_frontend_redirect_uri or ""
    ).strip() or None

    updated = update_oauth_runtime_settings(
        google_oauth_enabled=payload.google_oauth_enabled,
        google_redirect_uri=google_redirect_uri,
        google_frontend_redirect_uri=google_frontend_redirect_uri,
    )
    if not updated:
        raise HTTPException(status_code=500, detail="OAuth 설정 저장에 실패했습니다")

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="oauth_settings_updated",
        target_type="moderation_settings",
        target_id="11111111-1111-1111-1111-111111111111",
        reason="OAuth 런타임 설정 변경",
    )

    settings = get_effective_oauth_settings()
    return {
        "google_oauth_enabled": settings["google_oauth_enabled"],
        "google_redirect_uri": settings["google_redirect_uri"],
        "google_frontend_redirect_uri": settings["google_frontend_redirect_uri"],
    }


@app.get("/api/admin/integrations/oauth/health")
def get_admin_oauth_health(current_user: UserContext = Depends(require_admin)):
    _ = current_user
    settings = get_effective_oauth_settings()
    has_client_id = bool(GOOGLE_CLIENT_ID)
    has_client_secret = bool(GOOGLE_CLIENT_SECRET)
    return {
        "google_oauth_enabled": settings["google_oauth_enabled"],
        "has_client_id": has_client_id,
        "has_client_secret": has_client_secret,
        "google_redirect_uri": settings["google_redirect_uri"],
        "google_frontend_redirect_uri": settings["google_frontend_redirect_uri"],
        "is_ready": settings["google_oauth_enabled"]
        and has_client_id
        and has_client_secret
        and bool(settings["google_redirect_uri"])
        and bool(settings["google_frontend_redirect_uri"]),
    }


@app.get("/api/admin/action-logs")
def list_admin_action_logs(
    limit: int = 50,
    action_type: Optional[str] = None,
    actor_id: Optional[str] = None,
    page_id: Optional[str] = None,
    current_user: UserContext = Depends(require_admin),
):
    _ = current_user
    settings = get_effective_moderation_settings()
    view_window_days = cast(int, settings["admin_log_view_window_days"])
    mask_reasons = bool(settings.get("admin_log_mask_reasons", True))
    page_target_id = page_action_target_id(page_id) if page_id else None
    logs = get_admin_action_logs(
        limit=limit,
        view_window_days=view_window_days,
        action_type=(action_type or None),
        actor_id=(actor_id or None),
        target_type="page" if page_target_id else None,
        target_id=page_target_id,
    )
    for log in logs:
        log["id"] = str(log["id"])
        if log.get("admin_id"):
            log["admin_id"] = str(log["admin_id"])
        log["target_id"] = str(log["target_id"])
        log["reason"] = mask_sensitive_reason(
            cast(Optional[str], log.get("reason")),
            mask_reasons,
        )
    return {"items": logs, "next_cursor": None}


@app.get("/api/admin/action-logs/observability")
def get_admin_action_logs_observability(
    window_days: int = 30,
    current_user: UserContext = Depends(require_admin),
):
    _ = current_user
    normalized_window = max(1, min(window_days, 90))
    return get_admin_action_observability(view_window_days=normalized_window)


@app.get("/api/admin/users")
def list_admin_users(
    limit: int = 200, current_user: UserContext = Depends(require_admin)
):
    _ = current_user
    users = get_admin_users(limit=limit)
    for user in users:
        user["id"] = str(user["id"])
        if user.get("suspended_by"):
            user["suspended_by"] = str(user["suspended_by"])
        if user.get("deleted_by"):
            user["deleted_by"] = str(user["deleted_by"])
    return {"items": users, "next_cursor": None}


@app.patch("/api/admin/users/{user_id}/role")
def update_admin_user_role(
    user_id: str,
    payload: AdminUserRoleUpdateRequest,
    current_user: UserContext = Depends(require_super_admin),
):
    if current_user["id"] == user_id:
        raise HTTPException(
            status_code=400, detail="본인 계정 권한은 변경할 수 없습니다"
        )

    target_user = get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    target_role = target_user.get("role")
    if target_role == "super_admin":
        raise HTTPException(
            status_code=403, detail="슈퍼 관리자 권한은 변경할 수 없습니다"
        )

    if target_role == payload.role:
        target_user["id"] = str(target_user["id"])
        return target_user

    updated_user = set_user_role(user_id=user_id, role=payload.role)
    if not updated_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    change_reason = (payload.reason or "").strip()
    from_role = str(target_role) if target_role is not None else "unknown"
    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="user_role_updated",
        target_type="user",
        target_id=user_id,
        reason=change_reason or f"role:{from_role}->{payload.role}",
    )

    updated_user["id"] = str(updated_user["id"])
    if updated_user.get("suspended_by"):
        updated_user["suspended_by"] = str(updated_user["suspended_by"])
    if updated_user.get("deleted_by"):
        updated_user["deleted_by"] = str(updated_user["deleted_by"])
    return updated_user


@app.get("/api/admin/projects")
def list_admin_projects(
    status: Optional[str] = None,
    limit: int = 200,
    current_user: UserContext = Depends(require_admin),
):
    _ = current_user
    projects = get_admin_projects(status=status, limit=limit)
    for project in projects:
        project["id"] = str(project["id"])
        project["author_id"] = str(project["author_id"])
    return {"items": projects, "next_cursor": None}


@app.patch("/api/admin/projects/{project_id}")
def update_admin_project(
    project_id: str,
    payload: AdminProjectUpdateRequest,
    current_user: UserContext = Depends(require_admin),
):
    updates = cast(dict[str, object], payload.model_dump(exclude_none=True))
    raw_reason = updates.pop("reason", None)
    reason = require_action_reason(raw_reason if isinstance(raw_reason, str) else None)
    if not updates:
        raise HTTPException(status_code=400, detail="변경할 프로젝트 필드가 없습니다")

    updated = update_project_admin(project_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    _invalidate_projects_cache()

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="project_updated",
        target_type="project",
        target_id=project_id,
        reason=reason,
    )

    updated["id"] = str(updated["id"])
    updated["author_id"] = str(updated["author_id"])
    return updated


@app.post("/api/admin/projects/{project_id}/hide")
def hide_admin_project(
    project_id: str,
    payload: AdminActionReasonRequest,
    current_user: UserContext = Depends(require_admin),
):
    reason = require_action_reason(payload.reason)
    updated = set_project_status(project_id=project_id, status="hidden")
    if not updated:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    _invalidate_projects_cache()

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="project_hidden",
        target_type="project",
        target_id=project_id,
        reason=reason,
    )

    updated["id"] = str(updated["id"])
    updated["author_id"] = str(updated["author_id"])
    return updated


@app.post("/api/admin/projects/{project_id}/restore")
def restore_admin_project(
    project_id: str,
    payload: AdminActionReasonRequest,
    current_user: UserContext = Depends(require_admin),
):
    reason = require_action_reason(payload.reason)
    updated = set_project_status(project_id=project_id, status="published")
    if not updated:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    _invalidate_projects_cache()

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="project_restored",
        target_type="project",
        target_id=project_id,
        reason=reason,
    )

    updated["id"] = str(updated["id"])
    updated["author_id"] = str(updated["author_id"])
    return updated


@app.delete("/api/admin/projects/{project_id}")
def delete_admin_project(
    project_id: str,
    payload: AdminActionReasonRequest,
    current_user: UserContext = Depends(require_admin),
):
    reason = require_action_reason(payload.reason)
    updated = set_project_status(project_id=project_id, status="deleted")
    if not updated:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    _invalidate_projects_cache()

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="project_deleted",
        target_type="project",
        target_id=project_id,
        reason=reason,
    )

    updated["id"] = str(updated["id"])
    updated["author_id"] = str(updated["author_id"])
    return updated


@app.post("/api/admin/users/{user_id}/limit")
def limit_user_endpoint(
    user_id: str,
    payload: AdminUserLimitRequest,
    current_user: UserContext = Depends(require_admin),
):
    validate_enforcement_target(
        user_id,
        current_user,
        allow_admin_target=current_user.get("role") == "super_admin",
    )
    if payload.hours <= 0:
        raise HTTPException(status_code=400, detail="hours는 1 이상이어야 합니다")

    limited_user = limit_user(
        user_id=user_id,
        hours=payload.hours,
        reason=payload.reason,
        allow_admin_target=current_user.get("role") == "super_admin",
    )
    if not limited_user:
        raise HTTPException(
            status_code=404, detail="사용자를 찾을 수 없거나 제한할 수 없습니다"
        )

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="user_limited",
        target_type="user",
        target_id=user_id,
        reason=payload.reason,
    )

    limited_user["id"] = str(limited_user["id"])
    return limited_user


@app.delete("/api/admin/users/{user_id}/limit")
def unlimit_user_endpoint(
    user_id: str,
    current_user: UserContext = Depends(require_admin),
):
    validate_enforcement_target(
        user_id,
        current_user,
        allow_admin_target=current_user.get("role") == "super_admin",
    )
    released_user = unlimit_user(
        user_id=user_id,
        allow_admin_target=current_user.get("role") == "super_admin",
    )
    if not released_user:
        raise HTTPException(
            status_code=404, detail="사용자를 찾을 수 없거나 해제할 수 없습니다"
        )

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="user_unlimited",
        target_type="user",
        target_id=user_id,
        reason="제한 해제",
    )

    released_user["id"] = str(released_user["id"])
    return released_user


@app.post("/api/admin/users/{user_id}/suspend")
def suspend_user_endpoint(
    user_id: str,
    payload: AdminActionReasonRequest,
    current_user: UserContext = Depends(require_admin),
):
    validate_enforcement_target(
        user_id,
        current_user,
        allow_admin_target=current_user.get("role") == "super_admin",
    )
    reason = require_action_reason(payload.reason)
    suspended_user = suspend_user(
        user_id=user_id,
        admin_id=current_user["id"],
        reason=reason,
        allow_admin_target=current_user.get("role") == "super_admin",
    )
    if not suspended_user:
        raise HTTPException(
            status_code=404, detail="사용자를 찾을 수 없거나 정지할 수 없습니다"
        )

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="user_suspended",
        target_type="user",
        target_id=user_id,
        reason=reason,
    )

    suspended_user["id"] = str(suspended_user["id"])
    if suspended_user.get("suspended_by"):
        suspended_user["suspended_by"] = str(suspended_user["suspended_by"])
    return suspended_user


@app.delete("/api/admin/users/{user_id}/suspend")
def unsuspend_user_endpoint(
    user_id: str,
    current_user: UserContext = Depends(require_admin),
):
    validate_enforcement_target(
        user_id,
        current_user,
        allow_admin_target=current_user.get("role") == "super_admin",
    )
    released_user = unsuspend_user(user_id=user_id)
    if not released_user:
        raise HTTPException(
            status_code=404, detail="사용자를 찾을 수 없거나 정지 해제할 수 없습니다"
        )

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="user_unsuspended",
        target_type="user",
        target_id=user_id,
        reason="계정 정지 해제",
    )

    released_user["id"] = str(released_user["id"])
    return released_user


@app.post("/api/admin/users/{user_id}/tokens/revoke")
def revoke_user_tokens_endpoint(
    user_id: str,
    payload: AdminActionReasonRequest,
    current_user: UserContext = Depends(require_admin),
):
    validate_enforcement_target(
        user_id,
        current_user,
        allow_admin_target=current_user.get("role") == "super_admin",
    )
    reason = (
        payload.reason.strip() if isinstance(payload.reason, str) else "세션 무효화"
    )
    updated_user = revoke_user_tokens(user_id=user_id)
    if not updated_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="user_tokens_revoked",
        target_type="user",
        target_id=user_id,
        reason=reason,
    )

    updated_user["id"] = str(updated_user["id"])
    if updated_user.get("suspended_by"):
        updated_user["suspended_by"] = str(updated_user["suspended_by"])
    return updated_user


@app.post("/api/admin/users/{user_id}/delete-schedule")
def schedule_user_delete_endpoint(
    user_id: str,
    payload: AdminUserDeleteScheduleRequest,
    current_user: UserContext = Depends(require_admin),
):
    validate_enforcement_target(
        user_id,
        current_user,
        allow_admin_target=current_user.get("role") == "super_admin",
    )
    if payload.days < 1:
        raise HTTPException(status_code=400, detail="days는 1 이상이어야 합니다")

    reason = require_action_reason(payload.reason)
    scheduled_user = schedule_user_deletion(
        user_id=user_id,
        admin_id=current_user["id"],
        days=payload.days,
        reason=reason,
        allow_admin_target=current_user.get("role") == "super_admin",
    )
    if not scheduled_user:
        raise HTTPException(
            status_code=404,
            detail="사용자를 찾을 수 없거나 삭제 예약할 수 없습니다",
        )

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="user_delete_scheduled",
        target_type="user",
        target_id=user_id,
        reason=f"days={payload.days}, reason={reason}",
    )

    scheduled_user["id"] = str(scheduled_user["id"])
    if scheduled_user.get("suspended_by"):
        scheduled_user["suspended_by"] = str(scheduled_user["suspended_by"])
    return scheduled_user


@app.delete("/api/admin/users/{user_id}/delete-schedule")
def cancel_user_delete_schedule_endpoint(
    user_id: str,
    current_user: UserContext = Depends(require_admin),
):
    validate_enforcement_target(
        user_id,
        current_user,
        allow_admin_target=current_user.get("role") == "super_admin",
    )
    restored_user = cancel_user_deletion(
        user_id=user_id,
        allow_admin_target=current_user.get("role") == "super_admin",
    )
    if not restored_user:
        raise HTTPException(
            status_code=404,
            detail="삭제 예약 상태 사용자를 찾을 수 없거나 예약 취소할 수 없습니다",
        )

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="user_delete_schedule_canceled",
        target_type="user",
        target_id=user_id,
        reason="삭제 예약 취소",
    )

    restored_user["id"] = str(restored_user["id"])
    return restored_user


@app.post("/api/admin/users/{user_id}/delete-now")
def delete_user_now_endpoint(
    user_id: str,
    payload: AdminActionReasonRequest,
    current_user: UserContext = Depends(require_super_admin),
):
    validate_enforcement_target(
        user_id,
        current_user,
        allow_admin_target=True,
    )
    reason = require_action_reason(payload.reason)
    deleted_user = delete_user_now(
        user_id=user_id,
        admin_id=current_user["id"],
        reason=reason,
        allow_admin_target=True,
    )
    if not deleted_user:
        raise HTTPException(
            status_code=404, detail="사용자를 찾을 수 없거나 삭제할 수 없습니다"
        )

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="user_deleted",
        target_type="user",
        target_id=user_id,
        reason=reason,
    )

    deleted_user["id"] = str(deleted_user["id"])
    if deleted_user.get("suspended_by"):
        deleted_user["suspended_by"] = str(deleted_user["suspended_by"])
    if deleted_user.get("deleted_by"):
        deleted_user["deleted_by"] = str(deleted_user["deleted_by"])
    return deleted_user


@app.post("/api/admin/users/{user_id}/approve")
def approve_user_endpoint(
    user_id: str,
    current_user: UserContext = Depends(require_admin),
):
    approved_user = approve_user(user_id=user_id)
    if not approved_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="user_approved",
        target_type="user",
        target_id=user_id,
        reason="가입 승인",
    )

    approved_user["id"] = str(approved_user["id"])
    return approved_user


@app.post("/api/admin/users/{user_id}/reject")
def reject_user_endpoint(
    user_id: str,
    payload: AdminActionReasonRequest,
    current_user: UserContext = Depends(require_admin),
):
    reason = require_action_reason(payload.reason)
    rejected_user = reject_user(user_id=user_id)
    if not rejected_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="user_rejected",
        target_type="user",
        target_id=user_id,
        reason=reason,
    )

    rejected_user["id"] = str(rejected_user["id"])
    return rejected_user


@app.get("/api/admin/policies")
def get_admin_policies(current_user: UserContext = Depends(require_admin)):
    _ = current_user
    return get_effective_moderation_settings()


@app.patch("/api/admin/policies")
def update_admin_policies(
    payload: AdminPolicyUpdateRequest,
    current_user: UserContext = Depends(require_admin),
):
    if payload.auto_hide_report_threshold < 1:
        raise HTTPException(status_code=400, detail="임계치는 1 이상이어야 합니다")

    cleaned_keywords = normalize_keyword_list(payload.blocked_keywords)
    effective_keywords = get_effective_blocked_keywords(cleaned_keywords)
    current_settings = get_effective_moderation_settings()
    home_tabs_payload = (
        [tab.model_dump() for tab in payload.home_filter_tabs]
        if payload.home_filter_tabs is not None
        else cast(list[dict[str, str]], current_settings["home_filter_tabs"])
    )
    explore_tabs_payload = (
        [tab.model_dump() for tab in payload.explore_filter_tabs]
        if payload.explore_filter_tabs is not None
        else cast(list[dict[str, str]], current_settings["explore_filter_tabs"])
    )
    home_filter_tabs = normalize_filter_tabs(
        home_tabs_payload, DEFAULT_HOME_FILTER_TABS
    )
    explore_filter_tabs = normalize_filter_tabs(
        explore_tabs_payload,
        DEFAULT_EXPLORE_FILTER_TABS,
    )
    admin_log_retention_days = normalize_positive_int(
        payload.admin_log_retention_days,
        cast(int, current_settings["admin_log_retention_days"]),
        minimum=30,
        maximum=3650,
    )
    admin_log_view_window_days = normalize_positive_int(
        payload.admin_log_view_window_days,
        cast(int, current_settings["admin_log_view_window_days"]),
        minimum=1,
        maximum=365,
    )
    admin_log_mask_reasons = (
        payload.admin_log_mask_reasons
        if payload.admin_log_mask_reasons is not None
        else bool(current_settings.get("admin_log_mask_reasons", True))
    )
    page_editor_enabled = (
        payload.page_editor_enabled
        if payload.page_editor_enabled is not None
        else bool(current_settings.get("page_editor_enabled", True))
    )
    page_editor_rollout_stage = normalize_rollout_stage(
        payload.page_editor_rollout_stage,
        cast(
            str,
            current_settings.get(
                "page_editor_rollout_stage", DEFAULT_PAGE_EDITOR_ROLLOUT_STAGE
            ),
        ),
    )
    page_editor_pilot_admin_ids = sorted(
        {
            admin_id.strip()
            for admin_id in (
                payload.page_editor_pilot_admin_ids
                if payload.page_editor_pilot_admin_ids is not None
                else cast(
                    list[str], current_settings.get("page_editor_pilot_admin_ids", [])
                )
            )
            if admin_id and admin_id.strip()
        }
    )
    page_editor_publish_fail_rate_threshold = normalize_ratio(
        payload.page_editor_publish_fail_rate_threshold,
        cast(
            float,
            current_settings.get(
                "page_editor_publish_fail_rate_threshold",
                DEFAULT_PAGE_EDITOR_PUBLISH_FAIL_RATE_THRESHOLD,
            ),
        ),
    )
    page_editor_rollback_ratio_threshold = normalize_ratio(
        payload.page_editor_rollback_ratio_threshold,
        cast(
            float,
            current_settings.get(
                "page_editor_rollback_ratio_threshold",
                DEFAULT_PAGE_EDITOR_ROLLBACK_RATIO_THRESHOLD,
            ),
        ),
    )
    page_editor_conflict_rate_threshold = normalize_ratio(
        payload.page_editor_conflict_rate_threshold,
        cast(
            float,
            current_settings.get(
                "page_editor_conflict_rate_threshold",
                DEFAULT_PAGE_EDITOR_CONFLICT_RATE_THRESHOLD,
            ),
        ),
    )
    curated_review_quality_threshold = normalize_positive_int(
        payload.curated_review_quality_threshold,
        cast(
            int,
            current_settings.get(
                "curated_review_quality_threshold",
                DEFAULT_CURATED_REVIEW_QUALITY_THRESHOLD,
            ),
        ),
        minimum=1,
        maximum=100,
    )
    curated_related_click_boost_min_relevance = normalize_positive_int(
        payload.curated_related_click_boost_min_relevance,
        cast(
            int,
            current_settings.get(
                "curated_related_click_boost_min_relevance",
                DEFAULT_CURATED_RELATED_CLICK_BOOST_MIN_RELEVANCE,
            ),
        ),
        minimum=1,
        maximum=100,
    )
    curated_related_click_boost_multiplier = normalize_positive_int(
        payload.curated_related_click_boost_multiplier,
        cast(
            int,
            current_settings.get(
                "curated_related_click_boost_multiplier",
                DEFAULT_CURATED_RELATED_CLICK_BOOST_MULTIPLIER,
            ),
        ),
        minimum=1,
        maximum=200,
    )
    curated_related_click_boost_cap = normalize_positive_int(
        payload.curated_related_click_boost_cap,
        cast(
            int,
            current_settings.get(
                "curated_related_click_boost_cap",
                DEFAULT_CURATED_RELATED_CLICK_BOOST_CAP,
            ),
        ),
        minimum=1,
        maximum=500,
    )

    updated = update_moderation_settings(
        blocked_keywords=effective_keywords,
        auto_hide_report_threshold=payload.auto_hide_report_threshold,
        home_filter_tabs=home_filter_tabs,
        explore_filter_tabs=explore_filter_tabs,
        admin_log_retention_days=admin_log_retention_days,
        admin_log_view_window_days=admin_log_view_window_days,
        admin_log_mask_reasons=admin_log_mask_reasons,
        page_editor_enabled=page_editor_enabled,
        page_editor_rollout_stage=page_editor_rollout_stage,
        page_editor_pilot_admin_ids=page_editor_pilot_admin_ids,
        page_editor_publish_fail_rate_threshold=page_editor_publish_fail_rate_threshold,
        page_editor_rollback_ratio_threshold=page_editor_rollback_ratio_threshold,
        page_editor_conflict_rate_threshold=page_editor_conflict_rate_threshold,
        curated_review_quality_threshold=curated_review_quality_threshold,
        curated_related_click_boost_min_relevance=curated_related_click_boost_min_relevance,
        curated_related_click_boost_multiplier=curated_related_click_boost_multiplier,
        curated_related_click_boost_cap=curated_related_click_boost_cap,
    )
    if not updated:
        raise HTTPException(status_code=500, detail="정책 저장에 실패했습니다")

    policy_log_metadata = build_policy_update_log_metadata(
        previous_settings=current_settings,
        next_settings=updated,
    )
    threshold_change = cast(
        Mapping[str, object], policy_log_metadata["curated_quality_threshold"]
    )
    previous_threshold = threshold_change.get("previous")
    next_threshold = threshold_change.get("next")

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="policy_updated",
        target_type="moderation_settings",
        target_id="00000000-0000-0000-0000-000000000001",
        reason=(
            f"curated_quality_threshold={next_threshold}, "
            f"curated_quality_threshold_previous={previous_threshold}, "
            f"keywords={len(effective_keywords)}, "
            f"threshold={payload.auto_hide_report_threshold}, "
            f"retention_days={admin_log_retention_days}, "
            f"view_window_days={admin_log_view_window_days}, "
            f"mask_reasons={admin_log_mask_reasons}, "
            f"page_editor_enabled={page_editor_enabled}, "
            f"rollout_stage={page_editor_rollout_stage}, "
            f"pilot_admin_count={len(page_editor_pilot_admin_ids)}, "
            f"curated_quality_threshold_next={curated_review_quality_threshold}, "
            f"click_boost_min_relevance={curated_related_click_boost_min_relevance}, "
            f"click_boost_multiplier={curated_related_click_boost_multiplier}, "
            f"click_boost_cap={curated_related_click_boost_cap}"
        ),
        metadata=policy_log_metadata,
    )

    return get_effective_moderation_settings()


@app.get("/api/admin/pages/{page_id}/migration/preview")
def get_admin_page_migration_preview(
    page_id: str,
    current_user: UserContext = Depends(require_super_admin),
):
    _ = current_user
    return build_page_migration_preview(page_id)


@app.get("/api/admin/pages/{page_id}/migration/backups")
def get_admin_page_migration_backups(
    page_id: str,
    limit: int = 20,
    current_user: UserContext = Depends(require_super_admin),
):
    _ = current_user
    return list_page_migration_backups(page_id, limit=limit)


@app.post("/api/admin/pages/{page_id}/migration/execute")
def execute_admin_page_migration(
    page_id: str,
    payload: AdminPageMigrationExecuteRequest,
    current_user: UserContext = Depends(require_super_admin),
):
    reason = require_action_reason(payload.reason)
    return execute_page_migration(
        page_id=page_id,
        actor_id=current_user["id"],
        reason=reason,
        dry_run=payload.dryRun,
    )


@app.post("/api/admin/pages/{page_id}/migration/restore")
def restore_admin_page_migration(
    page_id: str,
    payload: AdminPageMigrationRestoreRequest,
    current_user: UserContext = Depends(require_super_admin),
):
    reason = require_action_reason(payload.reason)
    return restore_page_migration_backup(
        page_id=page_id,
        backup_key=payload.backupKey.strip(),
        actor_id=current_user["id"],
        reason=reason,
        dry_run=payload.dryRun,
    )


@app.get("/api/admin/pages/{page_id}/draft")
def get_admin_page_draft(
    page_id: str,
    current_user: UserContext = Depends(require_admin),
):
    enforce_page_editor_rollout_access(current_user)
    draft = get_page_document_draft(page_id)
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

    if page_id == ABOUT_CONTENT_KEY:
        about_payload = get_about_content_payload()
        document = build_page_document_from_about_content(page_id, about_payload, 0)
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
    payload: AdminPageDraftUpdateRequest,
    current_user: UserContext = Depends(require_admin),
):
    enforce_page_editor_rollout_access(current_user)
    if payload.document.pageId != page_id:
        raise HTTPException(status_code=400, detail="pageId가 경로와 일치하지 않습니다")

    issues = collect_page_document_issues(payload.document.model_dump())
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

    result = save_page_document_draft(
        page_id=page_id,
        base_version=payload.baseVersion,
        document_json=payload.document.model_dump(),
        actor_id=current_user["id"],
        reason=payload.reason,
    )
    if cast(bool, result.get("conflict", False)):
        current_updated_at = result.get("current_updated_at")
        current_updated_at_text = (
            current_updated_at.isoformat()
            if isinstance(current_updated_at, datetime)
            else (str(current_updated_at) if current_updated_at is not None else None)
        )
        write_admin_action_log(
            admin_id=current_user["id"],
            action_type="page_conflict_detected",
            target_type="page",
            target_id=page_action_target_id(page_id),
            reason=(payload.reason or "draft conflict").strip(),
            metadata={
                "page_id": page_id,
                "source": payload.source,
                "base_version": payload.baseVersion,
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

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="page_draft_saved",
        target_type="page",
        target_id=page_action_target_id(page_id),
        reason=(
            f"source={payload.source}; reason={(payload.reason or 'draft save').strip()}"
        ),
        metadata={
            "page_id": page_id,
            "source": payload.source,
            "base_version": payload.baseVersion,
            "saved_version": cast(int, result.get("saved_version", 0)),
        },
    )

    saved_version = cast(int, result.get("saved_version", 0))
    response_doc = payload.document.model_dump()
    response_doc["version"] = saved_version
    response_doc["updatedBy"] = current_user["id"]

    return {
        "savedVersion": saved_version,
        "document": response_doc,
        "warnings": issues["warnings"],
    }


@app.post("/api/admin/pages/{page_id}/publish")
def publish_admin_page(
    page_id: str,
    payload: AdminPagePublishRequest,
    current_user: UserContext = Depends(require_super_admin),
):
    enforce_page_editor_rollout_access(current_user)
    reason = require_action_reason(payload.reason)

    current_draft = get_page_document_draft(page_id)
    if not current_draft:
        raise HTTPException(status_code=404, detail="게시할 draft를 찾을 수 없습니다")

    current_draft_version = int(current_draft.get("draft_version", 0))
    target_draft_version = (
        int(payload.draftVersion)
        if payload.draftVersion is not None
        else current_draft_version
    )

    if (
        payload.draftVersion is not None
        and target_draft_version != current_draft_version
    ):
        write_admin_action_log(
            admin_id=current_user["id"],
            action_type="page_publish_failed",
            target_type="page",
            target_id=page_action_target_id(page_id),
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

    target_version_record = get_page_document_version(page_id, target_draft_version)
    if not target_version_record or not target_version_record.get("document_json"):
        raise HTTPException(status_code=404, detail="게시할 draft를 찾을 수 없습니다")

    issues = collect_page_document_issues(
        cast(dict[str, object], target_version_record["document_json"])
    )
    if issues["blocking"]:
        write_admin_action_log(
            admin_id=current_user["id"],
            action_type="page_publish_failed",
            target_type="page",
            target_id=page_action_target_id(page_id),
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

    published = publish_page_document(
        page_id=page_id,
        actor_id=current_user["id"],
        reason=reason,
        draft_version=target_draft_version,
    )
    if not published:
        raise HTTPException(status_code=404, detail="게시할 draft를 찾을 수 없습니다")

    published_version = cast(int, published["published_version"])
    if page_id == ABOUT_CONTENT_KEY:
        published_doc = get_page_document_version(page_id, published_version)
        if published_doc and published_doc.get("document_json"):
            about_payload = extract_about_content_from_page_document(
                cast(dict[str, object], published_doc["document_json"])
            )
            _ = upsert_site_content(ABOUT_CONTENT_KEY, about_payload)

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="page_published",
        target_type="page",
        target_id=page_action_target_id(page_id),
        reason=reason,
        metadata={
            "page_id": page_id,
            "draft_version": target_draft_version,
            "published_version": published_version,
        },
    )

    return {
        "publishedVersion": published_version,
    }


@app.get("/api/admin/pages/{page_id}/publish-schedules")
def list_admin_page_publish_schedules(
    page_id: str,
    limit: int = 50,
    current_user: UserContext = Depends(require_super_admin),
):
    enforce_page_editor_rollout_access(current_user)
    safe_limit = min(max(limit, 1), 100)
    items = [
        serialize_publish_schedule(item)
        for item in list_page_publish_schedules(page_id=page_id, limit=safe_limit)
    ]
    return {
        "pageId": page_id,
        "count": len(items),
        "items": items,
    }


@app.post("/api/admin/pages/{page_id}/publish-schedules")
def create_admin_page_publish_schedule(
    page_id: str,
    payload: AdminPagePublishScheduleCreateRequest,
    current_user: UserContext = Depends(require_super_admin),
):
    enforce_page_editor_rollout_access(current_user)
    reason = require_action_reason(payload.reason)

    current_draft = get_page_document_draft(page_id)
    if not current_draft:
        raise HTTPException(
            status_code=404, detail="예약 게시 대상 draft를 찾을 수 없습니다"
        )

    current_draft_version = int(current_draft.get("draft_version", 0))
    target_draft_version = (
        int(payload.draftVersion)
        if payload.draftVersion is not None
        else current_draft_version
    )
    if target_draft_version <= 0:
        raise HTTPException(
            status_code=400, detail="예약 게시 대상 draftVersion이 올바르지 않습니다"
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

    target_record = get_page_document_version(page_id, target_draft_version)
    if not target_record or not target_record.get("document_json"):
        raise HTTPException(
            status_code=404, detail="예약 게시 대상 draft를 찾을 수 없습니다"
        )

    issues = collect_page_document_issues(
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

    publish_at = parse_schedule_publish_at(payload.publishAt)
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    if publish_at <= now_utc:
        raise HTTPException(
            status_code=400, detail="publishAt은 현재 시각 이후여야 합니다"
        )

    schedule_id = f"ps_{int(time.time())}_{secrets.token_hex(4)}"
    record = create_page_publish_schedule(
        schedule_id=schedule_id,
        page_id=page_id,
        draft_version=target_draft_version,
        publish_at=publish_at.isoformat(sep=" ", timespec="seconds"),
        timezone=(payload.timezone or "Asia/Seoul").strip() or "Asia/Seoul",
        actor_id=current_user["id"],
        reason=reason,
    )

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="page_publish_scheduled",
        target_type="page",
        target_id=page_action_target_id(page_id),
        reason=f"schedule_id={schedule_id}; draft_version={target_draft_version}; publish_at={publish_at.isoformat()}; {reason}",
    )

    return {
        "scheduled": True,
        "schedule": serialize_publish_schedule(
            cast(Mapping[str, object], record or {})
        ),
    }


@app.post("/api/admin/pages/{page_id}/publish-schedules/{schedule_id}/cancel")
def cancel_admin_page_publish_schedule(
    page_id: str,
    schedule_id: str,
    payload: AdminPagePublishScheduleActionRequest,
    current_user: UserContext = Depends(require_super_admin),
):
    enforce_page_editor_rollout_access(current_user)
    reason = require_action_reason(payload.reason)
    cancelled = cancel_page_publish_schedule(
        page_id=page_id,
        schedule_id=schedule_id,
        actor_id=current_user["id"],
        reason=reason,
    )
    if not cancelled:
        raise HTTPException(
            status_code=404, detail="취소 가능한 예약 게시를 찾을 수 없습니다"
        )

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="page_publish_schedule_cancelled",
        target_type="page",
        target_id=page_action_target_id(page_id),
        reason=f"schedule_id={schedule_id}; {reason}",
    )

    return {
        "cancelled": True,
        "schedule": serialize_publish_schedule(cast(Mapping[str, object], cancelled)),
    }


@app.post("/api/admin/pages/{page_id}/publish-schedules/{schedule_id}/retry")
def retry_admin_page_publish_schedule(
    page_id: str,
    schedule_id: str,
    payload: AdminPagePublishScheduleActionRequest,
    current_user: UserContext = Depends(require_super_admin),
):
    enforce_page_editor_rollout_access(current_user)
    reason = require_action_reason(payload.reason)
    retried = retry_page_publish_schedule(
        page_id=page_id,
        schedule_id=schedule_id,
        actor_id=current_user["id"],
        reason=reason,
    )
    if not retried:
        raise HTTPException(
            status_code=404, detail="재시도 가능한 예약 게시를 찾을 수 없습니다"
        )

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="page_publish_schedule_retry_requested",
        target_type="page",
        target_id=page_action_target_id(page_id),
        reason=f"schedule_id={schedule_id}; {reason}",
    )

    return {
        "retried": True,
        "schedule": serialize_publish_schedule(cast(Mapping[str, object], retried)),
    }


@app.post("/api/admin/pages/{page_id}/publish-schedules/process")
def process_admin_page_publish_schedules(
    page_id: str,
    payload: AdminPagePublishScheduleProcessRequest,
    current_user: UserContext = Depends(require_super_admin),
):
    enforce_page_editor_rollout_access(current_user)
    safe_limit = min(max(payload.limit, 1), 50)
    process_reason = (payload.reason or "scheduled publish process").strip()

    due_items = list_due_page_publish_schedules(page_id=page_id, limit=safe_limit)
    published_count = 0
    failed_count = 0
    results: list[dict[str, object]] = []

    for row in due_items:
        schedule_id = str(row.get("schedule_id") or "")
        draft_version = int(row.get("draft_version") or 0)

        try:
            current_draft = get_page_document_draft(page_id)
            if not current_draft:
                raise RuntimeError("draft_not_found")

            current_draft_version = int(current_draft.get("draft_version", 0))
            if current_draft_version != draft_version:
                raise RuntimeError(
                    f"draft_version_conflict: scheduled={draft_version}, current={current_draft_version}"
                )

            published = publish_page_document(
                page_id=page_id,
                actor_id=current_user["id"],
                reason=f"scheduled_publish:{schedule_id}; {process_reason}",
                draft_version=draft_version,
            )
            if not published:
                raise RuntimeError("publish_failed")

            published_version = int(published.get("published_version", 0))
            if page_id == ABOUT_CONTENT_KEY:
                published_doc = get_page_document_version(page_id, published_version)
                if published_doc and published_doc.get("document_json"):
                    about_payload = extract_about_content_from_page_document(
                        cast(dict[str, object], published_doc["document_json"])
                    )
                    _ = upsert_site_content(ABOUT_CONTENT_KEY, about_payload)

            _ = mark_page_publish_schedule_published(
                page_id=page_id,
                schedule_id=schedule_id,
                published_version=published_version,
            )
            write_admin_action_log(
                admin_id=current_user["id"],
                action_type="page_publish_scheduled_executed",
                target_type="page",
                target_id=page_action_target_id(page_id),
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
        except Exception as exc:  # noqa: BLE001
            error_message = str(exc) or "unknown_error"
            _ = mark_page_publish_schedule_failed(
                page_id=page_id,
                schedule_id=schedule_id,
                error_message=error_message,
            )
            write_admin_action_log(
                admin_id=current_user["id"],
                action_type="page_publish_scheduled_failed",
                target_type="page",
                target_id=page_action_target_id(page_id),
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
    current_user: UserContext = Depends(require_admin),
):
    enforce_page_editor_rollout_access(current_user)
    items = list_page_document_versions(page_id=page_id, limit=limit)
    for item in items:
        item["created_by"] = str(item.get("created_by") or "")
        item["page_id"] = str(item.get("page_id") or page_id)
    return {
        "items": items,
        "next_cursor": None,
    }


@app.get("/api/admin/pages/{page_id}/versions/{version}")
def get_admin_page_version(
    page_id: str,
    version: int,
    current_user: UserContext = Depends(require_admin),
):
    enforce_page_editor_rollout_access(current_user)
    record = get_page_document_version(page_id, version)
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
    current_user: UserContext = Depends(require_admin),
):
    enforce_page_editor_rollout_access(current_user)
    from_record = get_page_document_version(page_id, from_version)
    to_record = get_page_document_version(page_id, to_version)
    if not from_record or not to_record:
        raise HTTPException(status_code=404, detail="비교 대상 버전을 찾을 수 없습니다")

    from_document = cast(dict[str, object], from_record.get("document_json") or {})
    to_document = cast(dict[str, object], to_record.get("document_json") or {})
    changes = build_page_document_diff(from_document, to_document)
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
                [change for change in changes if change["kind"] == "block_reordered"]
            ),
            "field_changed": len(
                [change for change in changes if change["kind"] == "field_changed"]
            ),
        },
    }


@app.post("/api/admin/pages/{page_id}/rollback")
def rollback_admin_page(
    page_id: str,
    payload: AdminPageRollbackRequest,
    current_user: UserContext = Depends(require_super_admin),
):
    enforce_page_editor_rollout_access(current_user)
    reason = require_action_reason(payload.reason)
    restored = rollback_page_document(
        page_id=page_id,
        target_version=payload.targetVersion,
        actor_id=current_user["id"],
        reason=reason,
        publish_now=payload.publishNow,
    )
    if not restored:
        raise HTTPException(status_code=404, detail="복원 대상 버전을 찾을 수 없습니다")

    published_version = cast(Optional[int], restored.get("published_version"))
    if payload.publishNow and published_version and page_id == ABOUT_CONTENT_KEY:
        published_doc = get_page_document_version(page_id, published_version)
        if published_doc and published_doc.get("document_json"):
            about_payload = extract_about_content_from_page_document(
                cast(dict[str, object], published_doc["document_json"])
            )
            _ = upsert_site_content(ABOUT_CONTENT_KEY, about_payload)

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="page_rolled_back",
        target_type="page",
        target_id=page_action_target_id(page_id),
        reason=reason,
        metadata={
            "page_id": page_id,
            "target_version": payload.targetVersion,
            "restored_draft_version": cast(int, restored["restored_draft_version"]),
            "published_version": published_version,
            "publish_now": payload.publishNow,
        },
    )

    return {
        "restoredDraftVersion": cast(int, restored["restored_draft_version"]),
        "publishedVersion": published_version,
    }


@app.patch("/api/admin/content/about")
def update_about_content_endpoint(
    payload: AboutContentUpdateRequest,
    current_user: UserContext = Depends(require_admin),
):
    reason = require_action_reason(payload.reason)
    content = payload.model_dump(exclude={"reason"})
    updated = upsert_site_content(ABOUT_CONTENT_KEY, content)
    if not updated:
        raise HTTPException(status_code=500, detail="소개 페이지 저장에 실패했습니다")

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="about_content_updated",
        target_type="content",
        target_id=ABOUT_CONTENT_TARGET_ID,
        reason=reason,
    )

    response = updated["content_json"]
    response["updated_at"] = updated.get("updated_at")
    return response


@app.patch("/api/admin/reports/{report_id}")
def update_report_endpoint(
    report_id: str,
    payload: AdminReportUpdateRequest,
    current_user: UserContext = Depends(require_admin),
):
    """신고 처리 상태 변경 (관리자)"""
    _ = current_user
    updated = update_report(report_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="신고를 찾을 수 없습니다")
    updated["id"] = str(updated["id"])
    if updated.get("reporter_id"):
        updated["reporter_id"] = str(updated["reporter_id"])

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type=f"report_{payload.status}",
        target_type="report",
        target_id=report_id,
        reason=payload.reason,
    )

    return updated


# ============ Auth API ============


@app.get("/api/auth/google/start")
def google_auth_start():
    oauth_settings = ensure_google_oauth_available()

    state = create_access_token(
        data={"type": "google_oauth_state", "nonce": secrets.token_hex(12)},
        expires_delta=timedelta(seconds=GOOGLE_OAUTH_STATE_TTL_SECONDS),
    )
    create_oauth_state_token(state=state, ttl_seconds=GOOGLE_OAUTH_STATE_TTL_SECONDS)
    cleanup_oauth_state_tokens()
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": oauth_settings["google_redirect_uri"],
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
        "access_type": "offline",
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return {"auth_url": auth_url}


@app.get("/api/auth/google/callback")
def google_auth_callback(code: str, state: str):
    oauth_settings = ensure_google_oauth_available()

    decoded_state = decode_token(state)
    if not decoded_state or decoded_state.get("type") != "google_oauth_state":
        raise HTTPException(status_code=400, detail="유효하지 않은 OAuth state입니다")
    if not consume_oauth_state_token(state):
        raise HTTPException(
            status_code=400,
            detail="만료되었거나 이미 사용된 OAuth state입니다",
        )
    cleanup_oauth_state_tokens()

    token_request_body = urlencode(
        {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": oauth_settings["google_redirect_uri"],
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")

    token_payload: dict[str, object] = {}
    try:
        token_request = UrlRequest(
            "https://oauth2.googleapis.com/token",
            data=token_request_body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        with cast(_ReadableResponse, urlopen(token_request, timeout=10)) as response:
            token_json = cast(object, json.loads(response.read().decode("utf-8")))
            if not isinstance(token_json, dict):
                raise HTTPException(
                    status_code=502, detail="Google 토큰 응답이 유효하지 않습니다"
                )
            token_payload = cast(dict[str, object], token_json)
    except Exception as error:
        raise HTTPException(
            status_code=502, detail="Google 토큰 교환에 실패했습니다"
        ) from error

    raw_id_token = token_payload.get("id_token")
    if not isinstance(raw_id_token, str) or not raw_id_token:
        raise HTTPException(status_code=400, detail="Google id_token이 누락되었습니다")
    id_token = raw_id_token

    profile_payload: dict[str, object] = {}
    try:
        profile_request = UrlRequest(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={quote(id_token)}",
            method="GET",
        )
        with cast(_ReadableResponse, urlopen(profile_request, timeout=10)) as response:
            profile_json = cast(object, json.loads(response.read().decode("utf-8")))
            if not isinstance(profile_json, dict):
                raise HTTPException(
                    status_code=502,
                    detail="Google 프로필 응답이 유효하지 않습니다",
                )
            profile_payload = cast(dict[str, object], profile_json)
    except Exception as error:
        raise HTTPException(
            status_code=502, detail="Google 프로필 검증에 실패했습니다"
        ) from error

    raw_email = profile_payload.get("email")
    email = raw_email.strip().lower() if isinstance(raw_email, str) else ""
    raw_sub = profile_payload.get("sub")
    provider_user_id = raw_sub.strip() if isinstance(raw_sub, str) else ""
    email_verified = profile_payload.get("email_verified") in ("true", True)
    if not email or not provider_user_id:
        raise HTTPException(
            status_code=400, detail="Google 계정 정보가 올바르지 않습니다"
        )

    existing_google_user = get_user_by_provider("google", provider_user_id)
    if existing_google_user:
        nickname_for_upsert = existing_google_user["nickname"]
    else:
        nickname_for_upsert = ensure_unique_nickname(
            build_google_nickname(profile_payload)
        )

    user = create_or_update_google_user(
        email=email,
        nickname=nickname_for_upsert,
        provider_user_id=provider_user_id,
        email_verified=email_verified,
    )
    if not user:
        raise HTTPException(
            status_code=500, detail="Google 로그인 계정 생성에 실패했습니다"
        )
    user = ensure_bootstrap_super_admin(user)

    frontend_base = str(oauth_settings["google_frontend_redirect_uri"]).rstrip("/")
    user_status = user.get("status") or "active"
    if user_status != "active":
        return RedirectResponse(
            url=f"{frontend_base}/?oauth_status={user_status}",
            status_code=302,
        )

    exchange_code = create_access_token(
        data={
            "type": "google_oauth_code",
            "sub": str(user["id"]),
            "email": str(user["email"]),
            "nonce": secrets.token_hex(10),
        },
        expires_delta=timedelta(seconds=120),
    )
    create_oauth_state_token(exchange_code, ttl_seconds=120)
    cleanup_oauth_state_tokens()
    return RedirectResponse(
        url=f"{frontend_base}/?oauth_code={quote(exchange_code)}",
        status_code=302,
    )


@app.post("/api/auth/google/exchange", response_model=TokenResponse)
def exchange_google_oauth_code(payload: OAuthCodeExchangeRequest):
    oauth_code = payload.oauth_code.strip()
    if not oauth_code:
        raise HTTPException(status_code=400, detail="oauth_code가 필요합니다")

    if not consume_oauth_state_token(oauth_code):
        raise HTTPException(
            status_code=400,
            detail="만료되었거나 이미 사용된 OAuth 코드입니다",
        )
    cleanup_oauth_state_tokens()

    decoded = decode_token(oauth_code)
    if not decoded or decoded.get("type") != "google_oauth_code":
        raise HTTPException(status_code=400, detail="유효하지 않은 OAuth 코드입니다")

    user_id = decoded.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=400, detail="OAuth 코드 사용자 정보가 올바르지 않습니다"
        )

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    user = ensure_bootstrap_super_admin(cast(dict[str, object], user))
    status_raw = user.get("status")
    user_status = status_raw if isinstance(status_raw, str) and status_raw else "active"
    if user_status != "active":
        raise HTTPException(
            status_code=403, detail=get_blocked_user_message(user_status)
        )

    token_version = user.get("token_version")
    token_version_value = token_version if isinstance(token_version, int) else 0
    access_token = create_access_token(
        data={
            "sub": str(user["id"]),
            "email": str(user["email"]),
            "sv": token_version_value,
        }
    )

    return TokenResponse(access_token=access_token, user=build_user_context(user))


@app.post("/api/auth/register", response_model=TokenResponse)
def register(payload: RegisterRequest, request: Request):
    """회원가입"""
    client_ip = _extract_client_ip(request)
    enforce_rate_limit(
        "register_ip",
        client_ip,
        limit=REGISTER_IP_LIMIT_PER_HOUR,
        window_seconds=60.0 * 60.0,
        detail="회원가입 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요",
    )

    # 이메일 중복 확인
    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다")

    # 사용자 생성
    password_hash = get_password_hash(payload.password)
    user = create_user(payload.email, payload.nickname, password_hash, status="pending")
    if not user:
        raise HTTPException(status_code=500, detail="회원가입 처리에 실패했습니다")
    user = ensure_bootstrap_super_admin(user)

    # 토큰 생성
    token_version = user.get("token_version")
    token_version_value = token_version if isinstance(token_version, int) else 0
    access_token = create_access_token(
        data={
            "sub": str(user["id"]),
            "email": user["email"],
            "sv": token_version_value,
        }
    )

    return TokenResponse(
        access_token=access_token,
        user=build_user_context(user),
    )


@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request):
    """로그인"""
    client_ip = _extract_client_ip(request)
    normalized_email = payload.email.strip().lower()
    enforce_rate_limit(
        "login_ip",
        client_ip,
        limit=LOGIN_IP_LIMIT_PER_MINUTE,
        window_seconds=60.0,
        detail="로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요",
    )
    enforce_rate_limit(
        "login_account",
        normalized_email,
        limit=LOGIN_ACCOUNT_LIMIT_PER_HOUR,
        window_seconds=60.0 * 60.0,
        detail="해당 계정의 로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요",
    )

    user = get_user_by_email(payload.email)
    if not user:
        raise HTTPException(
            status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다"
        )

    user = ensure_bootstrap_super_admin(user)

    password_hash_raw = user.get("password_hash")
    password_hash = password_hash_raw if isinstance(password_hash_raw, str) else None
    if not password_hash and (user.get("provider") == "google"):
        raise HTTPException(
            status_code=400,
            detail="Google로 가입한 계정입니다. 비밀번호 대신 Google 로그인 버튼을 사용해 주세요",
        )

    if not password_hash or not verify_password(payload.password, password_hash):
        raise HTTPException(
            status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다"
        )

    status_raw = user.get("status")
    user_status = status_raw if isinstance(status_raw, str) and status_raw else "active"
    if user_status != "active":
        raise HTTPException(
            status_code=403, detail=get_blocked_user_message(user_status)
        )

    token_version = user.get("token_version")
    token_version_value = token_version if isinstance(token_version, int) else 0

    access_token = create_access_token(
        data={
            "sub": str(user["id"]),
            "email": user["email"],
            "sv": token_version_value,
        }
    )

    return TokenResponse(
        access_token=access_token,
        user=build_user_context(user),
    )


@app.get("/api/me")
async def get_me(current_user: UserContext = Depends(get_current_user)):
    """현재 사용자 정보"""
    return current_user


@app.post("/api/projects")
def create_project_endpoint(
    project: ProjectCreate,
    current_user: UserContext = Depends(get_current_user),
):
    settings = get_effective_moderation_settings()
    content_for_check = " ".join(
        [
            project.title,
            project.summary,
            project.description or "",
        ]
    )
    blocked_keywords = cast(list[str], settings["blocked_keywords"])
    if text_contains_blocked_keyword(content_for_check, blocked_keywords):
        raise HTTPException(
            status_code=400, detail="금칙어가 포함된 내용은 등록할 수 없습니다"
        )

    payload = project.model_dump()
    payload["author_id"] = current_user["id"]
    new_project = create_project(payload)
    if not new_project:
        raise HTTPException(status_code=500, detail="프로젝트 생성에 실패했습니다")
    _invalidate_projects_cache()
    new_project["id"] = str(new_project["id"])
    new_project["author_id"] = str(new_project["author_id"])
    return new_project


@app.patch("/api/me")
async def update_me(
    payload: ProfileUpdateRequest,
    current_user: UserContext = Depends(get_current_user),
):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="변경할 프로필 필드가 없습니다")

    if "nickname" in updates:
        nickname = (updates.get("nickname") or "").strip()
        if not nickname:
            raise HTTPException(
                status_code=400, detail="닉네임은 비어 있을 수 없습니다"
            )
        if len(nickname) < PROFILE_NICKNAME_MIN_LEN:
            raise HTTPException(
                status_code=400,
                detail=f"닉네임은 {PROFILE_NICKNAME_MIN_LEN}자 이상이어야 합니다",
            )
        if len(nickname) > PROFILE_NICKNAME_MAX_LEN:
            raise HTTPException(
                status_code=400,
                detail=f"닉네임은 {PROFILE_NICKNAME_MAX_LEN}자를 초과할 수 없습니다",
            )
        existing = get_user_by_nickname(nickname)
        if existing and str(existing["id"]) != current_user["id"]:
            raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다")
        updates["nickname"] = nickname

    if "bio" in updates:
        bio = (updates.get("bio") or "").strip()
        if len(bio) > PROFILE_BIO_MAX_LEN:
            raise HTTPException(
                status_code=400,
                detail=f"소개는 {PROFILE_BIO_MAX_LEN}자를 초과할 수 없습니다",
            )
        updates["bio"] = bio or None

    if "avatar_url" in updates:
        avatar_url = (updates.get("avatar_url") or "").strip()
        if avatar_url:
            parsed = urlparse(avatar_url)
            if parsed.scheme not in ("http", "https") or not parsed.netloc:
                raise HTTPException(
                    status_code=400,
                    detail="아바타 URL은 http/https 형식이어야 합니다",
                )
            updates["avatar_url"] = avatar_url
        else:
            updates["avatar_url"] = None

    updated_user = update_user_profile(current_user["id"], updates)
    if not updated_user:
        raise HTTPException(status_code=500, detail="프로필 수정에 실패했습니다")

    return {
        "id": str(updated_user["id"]),
        "email": updated_user["email"],
        "nickname": updated_user["nickname"],
        "role": updated_user["role"],
        "status": updated_user.get("status", "active"),
        "avatar_url": updated_user.get("avatar_url"),
        "bio": updated_user.get("bio"),
    }


@app.post("/api/projects/{project_id}/comments")
def create_comment_endpoint(
    project_id: str,
    comment: CommentCreate,
    current_user: UserContext = Depends(get_current_user),
):
    settings = get_effective_moderation_settings()
    blocked_keywords = cast(list[str], settings["blocked_keywords"])
    if text_contains_blocked_keyword(comment.content, blocked_keywords):
        raise HTTPException(
            status_code=400, detail="금칙어가 포함된 댓글은 작성할 수 없습니다"
        )

    new_comment = create_comment(
        project_id=project_id,
        content=comment.content,
        author_id=current_user["id"],
    )
    if not new_comment:
        raise HTTPException(status_code=500, detail="댓글 작성에 실패했습니다")
    new_comment["id"] = str(new_comment["id"])
    new_comment["project_id"] = str(new_comment["project_id"])
    new_comment["author_id"] = str(new_comment["author_id"])
    return new_comment


@app.get("/api/me/projects")
def get_my_projects(current_user: UserContext = Depends(get_current_user)):
    """내 프로젝트 목록"""
    projects = get_user_projects(current_user["id"])
    for p in projects:
        p["id"] = str(p["id"])
        p["author_id"] = str(p["author_id"])
    return {"items": projects, "next_cursor": None}


@app.get("/api/me/comments")
def get_my_comments(
    limit: int = 50,
    current_user: UserContext = Depends(get_current_user),
):
    comments = get_user_comments(current_user["id"], limit)
    for c in comments:
        c["id"] = str(c["id"])
        c["project_id"] = str(c["project_id"])
        c["author_id"] = str(c["author_id"])
        if c.get("parent_id"):
            c["parent_id"] = str(c["parent_id"])
    return {"items": comments, "next_cursor": None}


@app.get("/api/me/liked-projects")
def get_my_liked_projects(
    limit: int = 50,
    current_user: UserContext = Depends(get_current_user),
):
    projects = get_user_liked_projects(current_user["id"], limit)
    for p in projects:
        p["id"] = str(p["id"])
        p["author_id"] = str(p["author_id"])
    return {"items": projects, "next_cursor": None}
