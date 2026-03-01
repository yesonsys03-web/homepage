from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, Mapping, Sequence, Any
import re
import unicodedata
import time
from urllib.parse import urlparse
from threading import Lock
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
    get_user_by_email,
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
    get_latest_policy_update_action,
    get_admin_users,
    limit_user,
    unlimit_user,
    get_moderation_settings,
    update_moderation_settings,
    get_site_content,
    upsert_site_content,
)
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token,
)

app = FastAPI(title="VibeCoder Playground API")

PROJECT_LIST_CACHE_TTL_SECONDS = 12.0
PROJECT_PERF_WINDOW_SIZE = 300
_project_list_cache: dict[
    tuple[str, Optional[str], Optional[str]], tuple[float, list[dict[str, Any]]]
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
) -> Optional[list[dict[str, Any]]]:
    now = time.perf_counter()
    key = _project_cache_key(sort, platform, tag)
    with _project_list_cache_lock:
        cached = _project_list_cache.get(key)
        if not cached:
            return None
        expires_at, items = cached
        if expires_at <= now:
            _project_list_cache.pop(key, None)
            return None
        return [dict(item) for item in items]


def _set_cached_projects(
    sort: str,
    platform: Optional[str],
    tag: Optional[str],
    items: Sequence[Mapping[str, Any]],
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


def _project_perf_snapshot() -> dict[str, Any]:
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


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class AdminReportUpdateRequest(BaseModel):
    status: str
    reason: Optional[str] = None


class AdminUserLimitRequest(BaseModel):
    hours: int = 24
    reason: Optional[str] = None


class AdminPolicyUpdateRequest(BaseModel):
    blocked_keywords: list[str]
    auto_hide_report_threshold: int


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


def get_about_content_payload() -> dict:
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


def get_effective_moderation_settings() -> dict:
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
    if effective_keywords != (settings.get("blocked_keywords") or []):
        update_moderation_settings(
            blocked_keywords=effective_keywords,
            auto_hide_report_threshold=settings["auto_hide_report_threshold"],
        )


# ============ Startup Event ============


@app.on_event("startup")
async def startup_event():
    """앱 시작 시 DB 테이블 초기화"""
    try:
        init_db()
        ensure_baseline_moderation_settings()
        get_about_content_payload()
        _set_cached_projects(
            sort="latest", platform=None, tag=None, items=get_projects(sort="latest")
        )
    except Exception as e:
        print(f"⚠️  DB initialization warning: {e}")


# ============ Health Check ============


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/content/about")
def get_about_content_endpoint():
    return get_about_content_payload()


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


@app.post("/api/projects")
def create_project_endpoint(project: ProjectCreate):
    """프로젝트 생성"""
    settings = get_effective_moderation_settings()
    content_for_check = " ".join(
        [
            project.title,
            project.summary,
            project.description or "",
        ]
    )
    if text_contains_blocked_keyword(content_for_check, settings["blocked_keywords"]):
        raise HTTPException(
            status_code=400, detail="금칙어가 포함된 내용은 등록할 수 없습니다"
        )

    new_project = create_project(project.model_dump())
    if not new_project:
        raise HTTPException(status_code=500, detail="프로젝트 생성에 실패했습니다")
    _invalidate_projects_cache()
    new_project["id"] = str(new_project["id"])
    new_project["author_id"] = str(new_project["author_id"])
    return new_project


@app.post("/api/projects/{project_id}/like")
def like_project_endpoint(project_id: str):
    """프로젝트 좋아요"""
    try:
        like_count = like_project(project_id)
        _invalidate_projects_cache()
        return {"like_count": like_count}
    except Exception as e:
        raise HTTPException(status_code=404, detail="Project not found")


@app.delete("/api/projects/{project_id}/like")
def unlike_project_endpoint(project_id: str):
    """프로젝트 좋아요 취소"""
    try:
        like_count = unlike_project(project_id)
        _invalidate_projects_cache()
        return {"like_count": like_count}
    except Exception as e:
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
    return {"items": comments}


@app.post("/api/projects/{project_id}/comments")
def create_comment_endpoint(project_id: str, comment: CommentCreate):
    """댓글 작성"""
    settings = get_effective_moderation_settings()
    if text_contains_blocked_keyword(comment.content, settings["blocked_keywords"]):
        raise HTTPException(
            status_code=400, detail="금칙어가 포함된 댓글은 작성할 수 없습니다"
        )

    new_comment = create_comment(project_id, comment.content)
    if not new_comment:
        raise HTTPException(status_code=500, detail="댓글 작성에 실패했습니다")
    new_comment["id"] = str(new_comment["id"])
    new_comment["project_id"] = str(new_comment["project_id"])
    new_comment["author_id"] = str(new_comment["author_id"])
    return new_comment


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
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    return {
        "id": str(user["id"]),
        "email": user["email"],
        "nickname": user["nickname"],
        "role": user["role"],
        "avatar_url": user.get("avatar_url"),
        "bio": user.get("bio"),
    }


async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return current_user


@app.patch("/api/projects/{project_id}")
def update_project_endpoint(
    project_id: str,
    payload: ProjectUpdateRequest,
    current_user: dict = Depends(get_current_user),
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
    if text_contains_blocked_keyword(content_for_check, settings["blocked_keywords"]):
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
    current_user: dict = Depends(require_admin),
):
    """신고 목록 조회 (관리자)"""
    _ = current_user
    reports = get_reports(status=status, limit=limit, offset=offset)
    total = get_reports_count(status=status)
    for r in reports:
        r["id"] = str(r["id"])
        if r.get("reporter_id"):
            r["reporter_id"] = str(r["reporter_id"])
    return {"items": reports, "total": total}


@app.get("/api/admin/perf/projects")
def get_projects_perf(current_user: dict = Depends(require_admin)):
    _ = current_user
    return _project_perf_snapshot()


@app.get("/api/admin/action-logs")
def list_admin_action_logs(
    limit: int = 50, current_user: dict = Depends(require_admin)
):
    _ = current_user
    logs = get_admin_action_logs(limit=limit)
    for log in logs:
        log["id"] = str(log["id"])
        if log.get("admin_id"):
            log["admin_id"] = str(log["admin_id"])
        log["target_id"] = str(log["target_id"])
    return {"items": logs}


@app.get("/api/admin/users")
def list_admin_users(limit: int = 200, current_user: dict = Depends(require_admin)):
    _ = current_user
    users = get_admin_users(limit=limit)
    for user in users:
        user["id"] = str(user["id"])
    return {"items": users}


@app.get("/api/admin/projects")
def list_admin_projects(
    status: Optional[str] = None,
    limit: int = 200,
    current_user: dict = Depends(require_admin),
):
    _ = current_user
    projects = get_admin_projects(status=status, limit=limit)
    for project in projects:
        project["id"] = str(project["id"])
        project["author_id"] = str(project["author_id"])
    return {"items": projects}


@app.patch("/api/admin/projects/{project_id}")
def update_admin_project(
    project_id: str,
    payload: AdminProjectUpdateRequest,
    current_user: dict = Depends(require_admin),
):
    updates = payload.model_dump(exclude_none=True)
    reason = require_action_reason(updates.pop("reason", None))
    if not updates:
        raise HTTPException(status_code=400, detail="변경할 프로젝트 필드가 없습니다")

    updated = update_project_admin(project_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    _invalidate_projects_cache()

    create_admin_action_log(
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
    current_user: dict = Depends(require_admin),
):
    reason = require_action_reason(payload.reason)
    updated = set_project_status(project_id=project_id, status="hidden")
    if not updated:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    _invalidate_projects_cache()

    create_admin_action_log(
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
    current_user: dict = Depends(require_admin),
):
    reason = require_action_reason(payload.reason)
    updated = set_project_status(project_id=project_id, status="published")
    if not updated:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    _invalidate_projects_cache()

    create_admin_action_log(
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
    current_user: dict = Depends(require_admin),
):
    reason = require_action_reason(payload.reason)
    updated = set_project_status(project_id=project_id, status="deleted")
    if not updated:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    _invalidate_projects_cache()

    create_admin_action_log(
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
    current_user: dict = Depends(require_admin),
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

    create_admin_action_log(
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
    current_user: dict = Depends(require_admin),
):
    released_user = unlimit_user(user_id=user_id)
    if not released_user:
        raise HTTPException(
            status_code=404, detail="사용자를 찾을 수 없거나 해제할 수 없습니다"
        )

    create_admin_action_log(
        admin_id=current_user["id"],
        action_type="user_unlimited",
        target_type="user",
        target_id=user_id,
        reason="제한 해제",
    )

    released_user["id"] = str(released_user["id"])
    return released_user


@app.get("/api/admin/policies")
def get_admin_policies(current_user: dict = Depends(require_admin)):
    _ = current_user
    return get_effective_moderation_settings()


@app.patch("/api/admin/policies")
def update_admin_policies(
    payload: AdminPolicyUpdateRequest,
    current_user: dict = Depends(require_admin),
):
    if payload.auto_hide_report_threshold < 1:
        raise HTTPException(status_code=400, detail="임계치는 1 이상이어야 합니다")

    cleaned_keywords = normalize_keyword_list(payload.blocked_keywords)
    effective_keywords = get_effective_blocked_keywords(cleaned_keywords)

    updated = update_moderation_settings(
        blocked_keywords=effective_keywords,
        auto_hide_report_threshold=payload.auto_hide_report_threshold,
    )
    if not updated:
        raise HTTPException(status_code=500, detail="정책 저장에 실패했습니다")

    create_admin_action_log(
        admin_id=current_user["id"],
        action_type="policy_updated",
        target_type="moderation_settings",
        target_id="00000000-0000-0000-0000-000000000001",
        reason=f"keywords={len(effective_keywords)}, threshold={payload.auto_hide_report_threshold}",
    )

    return updated


@app.patch("/api/admin/content/about")
def update_about_content_endpoint(
    payload: AboutContentUpdateRequest,
    current_user: dict = Depends(require_admin),
):
    reason = require_action_reason(payload.reason)
    content = payload.model_dump(exclude={"reason"})
    updated = upsert_site_content(ABOUT_CONTENT_KEY, content)
    if not updated:
        raise HTTPException(status_code=500, detail="소개 페이지 저장에 실패했습니다")

    create_admin_action_log(
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
    current_user: dict = Depends(require_admin),
):
    """신고 처리 상태 변경 (관리자)"""
    _ = current_user
    updated = update_report(report_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="신고를 찾을 수 없습니다")
    updated["id"] = str(updated["id"])
    if updated.get("reporter_id"):
        updated["reporter_id"] = str(updated["reporter_id"])

    create_admin_action_log(
        admin_id=current_user["id"],
        action_type=f"report_{payload.status}",
        target_type="report",
        target_id=report_id,
        reason=payload.reason,
    )

    return updated


# ============ Auth API ============


@app.post("/api/auth/register", response_model=TokenResponse)
def register(request: RegisterRequest):
    """회원가입"""
    # 이메일 중복 확인
    existing = get_user_by_email(request.email)
    if existing:
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다")

    # 사용자 생성
    password_hash = get_password_hash(request.password)
    user = create_user(request.email, request.nickname, password_hash)
    if not user:
        raise HTTPException(status_code=500, detail="회원가입 처리에 실패했습니다")

    # 토큰 생성
    access_token = create_access_token(
        data={"sub": str(user["id"]), "email": user["email"]}
    )

    return TokenResponse(
        access_token=access_token,
        user={
            "id": str(user["id"]),
            "email": user["email"],
            "nickname": user["nickname"],
            "role": user["role"],
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
    if not password_hash or not verify_password(request.password, password_hash):
        raise HTTPException(
            status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다"
        )

    access_token = create_access_token(
        data={"sub": str(user["id"]), "email": user["email"]}
    )

    return TokenResponse(
        access_token=access_token,
        user={
            "id": str(user["id"]),
            "email": user["email"],
            "nickname": user["nickname"],
            "role": user["role"],
            "avatar_url": user.get("avatar_url"),
            "bio": user.get("bio"),
        },
    )


@app.get("/api/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """현재 사용자 정보"""
    return current_user


@app.patch("/api/me")
async def update_me(
    payload: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
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
        "avatar_url": updated_user.get("avatar_url"),
        "bio": updated_user.get("bio"),
    }


@app.get("/api/me/projects")
def get_my_projects(current_user: dict = Depends(get_current_user)):
    """내 프로젝트 목록"""
    projects = get_user_projects(current_user["id"])
    for p in projects:
        p["id"] = str(p["id"])
        p["author_id"] = str(p["author_id"])
    return {"items": projects}
