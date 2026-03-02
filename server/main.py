# pyright: reportUnknownVariableType=false, reportUnknownArgumentType=false, reportUnknownMemberType=false, reportUnknownParameterType=false, reportUnknownLambdaType=false, reportCallInDefaultInitializer=false, reportDeprecated=false

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, Mapping, Protocol, Sequence, TypedDict, cast
from datetime import timedelta
import asyncio
import re
import unicodedata
import time
import os
import json
import secrets
from urllib.parse import urlparse, urlencode, quote
from urllib.request import Request, urlopen
from threading import Lock
from contextlib import asynccontextmanager, suppress
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
    update_report,
    create_user,
    create_or_update_google_user,
    get_user_by_email,
    get_user_by_provider,
    get_user_by_nickname,
    get_user_by_id,
    update_user_profile,
    get_user_projects,
    get_admin_projects,
    update_project_admin,
    update_project_owner_fields,
    set_project_status,
    create_admin_action_log,
    get_admin_action_logs,
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
    get_moderation_settings,
    update_moderation_settings,
    get_oauth_runtime_settings,
    update_oauth_runtime_settings,
    create_oauth_state_token,
    consume_oauth_state_token,
    cleanup_oauth_state_tokens,
    get_site_content,
    upsert_site_content,
)
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ = app
    await startup_event()
    try:
        yield
    finally:
        await shutdown_event()


app = FastAPI(title="VibeCoder Playground API", lifespan=lifespan)

PROJECT_LIST_CACHE_TTL_SECONDS = 12.0
PROJECT_PERF_WINDOW_SIZE = 300
_project_list_cache: dict[
    tuple[str, Optional[str], Optional[str]], tuple[float, list[dict[str, object]]]
] = {}
_project_list_cache_lock = Lock()
_project_perf_samples: deque[tuple[float, float, int]] = deque(
    maxlen=PROJECT_PERF_WINDOW_SIZE
)
_project_perf_lock = Lock()


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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
ADMIN_LOG_CLEANUP_INTERVAL_SECONDS = 6 * 60 * 60
SYSTEM_ADMIN_USER_ID = "11111111-1111-1111-1111-111111111111"
_admin_log_cleanup_task: Optional[asyncio.Task[None]] = None

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback"
)
GOOGLE_FRONTEND_REDIRECT_URI = os.getenv(
    "GOOGLE_FRONTEND_REDIRECT_URI", "http://localhost:5173"
)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserContext"


class UserContext(TypedDict):
    id: str
    email: str
    nickname: str
    role: str
    status: str
    avatar_url: str | None
    bio: str | None


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
) -> None:
    if current_user["id"] == target_user_id:
        raise HTTPException(status_code=400, detail="본인 계정에는 적용할 수 없습니다")

    target_user = get_user_by_id(target_user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    target_role = target_user.get("role")
    if target_role == "admin":
        raise HTTPException(
            status_code=403, detail="관리자 계정에는 적용할 수 없습니다"
        )
    if target_role == "super_admin" and not allow_super_admin_target:
        raise HTTPException(
            status_code=403,
            detail="슈퍼 관리자 계정에는 적용할 수 없습니다",
        )


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
    )


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
    if (
        effective_keywords != (settings.get("blocked_keywords") or [])
        or home_filter_tabs != (settings.get("home_filter_tabs") or [])
        or explore_filter_tabs != (settings.get("explore_filter_tabs") or [])
        or admin_log_retention_days != settings.get("admin_log_retention_days")
        or admin_log_view_window_days != settings.get("admin_log_view_window_days")
        or admin_log_mask_reasons != settings.get("admin_log_mask_reasons")
    ):
        update_moderation_settings(
            blocked_keywords=effective_keywords,
            auto_hide_report_threshold=settings["auto_hide_report_threshold"],
            home_filter_tabs=home_filter_tabs,
            explore_filter_tabs=explore_filter_tabs,
            admin_log_retention_days=admin_log_retention_days,
            admin_log_view_window_days=admin_log_view_window_days,
            admin_log_mask_reasons=admin_log_mask_reasons,
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


# ============ Startup Event ============


async def startup_event():
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
        global _admin_log_cleanup_task
        if _admin_log_cleanup_task is None or _admin_log_cleanup_task.done():
            _admin_log_cleanup_task = asyncio.create_task(run_admin_log_cleanup_loop())
    except Exception as e:
        print(f"⚠️  DB initialization warning: {e}")


async def shutdown_event() -> None:
    global _admin_log_cleanup_task
    if _admin_log_cleanup_task is None:
        return

    _ = _admin_log_cleanup_task.cancel()
    with suppress(asyncio.CancelledError):
        await _admin_log_cleanup_task
    _admin_log_cleanup_task = None


# ============ Health Check ============


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


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


@app.post("/api/projects/{project_id}/like")
def like_project_endpoint(project_id: str):
    """프로젝트 좋아요"""
    try:
        like_count = like_project(project_id)
        _invalidate_projects_cache()
        return {"like_count": like_count}
    except Exception:
        raise HTTPException(status_code=404, detail="Project not found")


@app.delete("/api/projects/{project_id}/like")
def unlike_project_endpoint(project_id: str):
    """프로젝트 좋아요 취소"""
    try:
        like_count = unlike_project(project_id)
        _invalidate_projects_cache()
        return {"like_count": like_count}
    except Exception:
        raise HTTPException(status_code=404, detail="Project not found")


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

    user_status = user.get("status") or "active"
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
        "email": user["email"],
        "nickname": user["nickname"],
        "role": user["role"],
        "status": user_status,
        "avatar_url": user.get("avatar_url"),
        "bio": user.get("bio"),
    }


async def require_admin(current_user: UserContext = Depends(get_current_user)):
    if current_user.get("role") not in {"admin", "super_admin"}:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return current_user


async def require_super_admin(current_user: UserContext = Depends(get_current_user)):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="슈퍼 관리자 권한이 필요합니다")
    return current_user


@app.patch("/api/projects/{project_id}")
def update_project_endpoint(
    project_id: str,
    payload: ProjectUpdateRequest,
    current_user: UserContext = Depends(get_current_user),
):
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")

    is_admin = current_user.get("role") == "admin"
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
    limit: int = 50, current_user: UserContext = Depends(require_admin)
):
    _ = current_user
    settings = get_effective_moderation_settings()
    view_window_days = cast(int, settings["admin_log_view_window_days"])
    mask_reasons = bool(settings.get("admin_log_mask_reasons", True))
    logs = get_admin_action_logs(limit=limit, view_window_days=view_window_days)
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
    if payload.hours <= 0:
        raise HTTPException(status_code=400, detail="hours는 1 이상이어야 합니다")

    limited_user = limit_user(
        user_id=user_id, hours=payload.hours, reason=payload.reason
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
    released_user = unlimit_user(user_id=user_id)
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
    validate_enforcement_target(user_id, current_user)
    reason = require_action_reason(payload.reason)
    suspended_user = suspend_user(
        user_id=user_id, admin_id=current_user["id"], reason=reason
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
    validate_enforcement_target(user_id, current_user)
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
    validate_enforcement_target(user_id, current_user)
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
    validate_enforcement_target(user_id, current_user)
    if payload.days < 1:
        raise HTTPException(status_code=400, detail="days는 1 이상이어야 합니다")

    reason = require_action_reason(payload.reason)
    scheduled_user = schedule_user_deletion(
        user_id=user_id,
        admin_id=current_user["id"],
        days=payload.days,
        reason=reason,
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
    validate_enforcement_target(user_id, current_user)
    restored_user = cancel_user_deletion(user_id=user_id)
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
    validate_enforcement_target(user_id, current_user)
    reason = require_action_reason(payload.reason)
    deleted_user = delete_user_now(
        user_id=user_id,
        admin_id=current_user["id"],
        reason=reason,
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

    updated = update_moderation_settings(
        blocked_keywords=effective_keywords,
        auto_hide_report_threshold=payload.auto_hide_report_threshold,
        home_filter_tabs=home_filter_tabs,
        explore_filter_tabs=explore_filter_tabs,
        admin_log_retention_days=admin_log_retention_days,
        admin_log_view_window_days=admin_log_view_window_days,
        admin_log_mask_reasons=admin_log_mask_reasons,
    )
    if not updated:
        raise HTTPException(status_code=500, detail="정책 저장에 실패했습니다")

    write_admin_action_log(
        admin_id=current_user["id"],
        action_type="policy_updated",
        target_type="moderation_settings",
        target_id="00000000-0000-0000-0000-000000000001",
        reason=(
            f"keywords={len(effective_keywords)}, "
            f"threshold={payload.auto_hide_report_threshold}, "
            f"retention_days={admin_log_retention_days}, "
            f"view_window_days={admin_log_view_window_days}, "
            f"mask_reasons={admin_log_mask_reasons}"
        ),
    )

    return get_effective_moderation_settings()


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
        token_request = Request(
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
        profile_request = Request(
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

    frontend_base = str(oauth_settings["google_frontend_redirect_uri"]).rstrip("/")
    user_status = user.get("status") or "active"
    if user_status != "active":
        return RedirectResponse(
            url=f"{frontend_base}/?oauth_status={user_status}",
            status_code=302,
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
    return RedirectResponse(
        url=f"{frontend_base}/?oauth_token={quote(access_token)}",
        status_code=302,
    )


@app.post("/api/auth/register", response_model=TokenResponse)
def register(request: RegisterRequest):
    """회원가입"""
    # 이메일 중복 확인
    existing = get_user_by_email(request.email)
    if existing:
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다")

    # 사용자 생성
    password_hash = get_password_hash(request.password)
    user = create_user(request.email, request.nickname, password_hash, status="pending")
    if not user:
        raise HTTPException(status_code=500, detail="회원가입 처리에 실패했습니다")

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
        user={
            "id": str(user["id"]),
            "email": user["email"],
            "nickname": user["nickname"],
            "role": user["role"],
            "status": user.get("status", "pending"),
            "avatar_url": user.get("avatar_url"),
            "bio": user.get("bio"),
        },
    )


@app.post("/api/auth/login", response_model=TokenResponse)
def login(request: LoginRequest):
    """로그인"""
    user = get_user_by_email(request.email)
    if not user:
        raise HTTPException(
            status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다"
        )

    password_hash = user.get("password_hash")
    if not password_hash and (user.get("provider") == "google"):
        raise HTTPException(
            status_code=400,
            detail="Google로 가입한 계정입니다. 비밀번호 대신 Google 로그인 버튼을 사용해 주세요",
        )

    if not password_hash or not verify_password(request.password, password_hash):
        raise HTTPException(
            status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다"
        )

    user_status = user.get("status") or "active"
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
        user={
            "id": str(user["id"]),
            "email": user["email"],
            "nickname": user["nickname"],
            "role": user["role"],
            "status": user_status,
            "avatar_url": user.get("avatar_url"),
            "bio": user.get("bio"),
        },
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
