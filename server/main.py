from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional
import re
import unicodedata

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
    update_report,
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_user_projects,
    create_admin_action_log,
    get_admin_action_logs,
    get_latest_policy_update_action,
    get_admin_users,
    limit_user,
    unlimit_user,
    get_moderation_settings,
    update_moderation_settings,
)
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token,
)

app = FastAPI(title="VibeCoder Playground API")

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

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    except Exception as e:
        print(f"⚠️  DB initialization warning: {e}")


# ============ Health Check ============


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ============ Projects API ============


@app.get("/api/projects")
def list_projects(
    sort: str = "latest",
    platform: Optional[str] = None,
    tag: Optional[str] = None,
):
    """프로젝트 목록 조회"""
    try:
        projects = get_projects(sort=sort, platform=platform, tag=tag)
        # UUID를 문자열로 변환
        for p in projects:
            p["id"] = str(p["id"])
            p["author_id"] = str(p["author_id"])
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
    new_project["id"] = str(new_project["id"])
    new_project["author_id"] = str(new_project["author_id"])
    return new_project


@app.post("/api/projects/{project_id}/like")
def like_project_endpoint(project_id: str):
    """프로젝트 좋아요"""
    try:
        like_count = like_project(project_id)
        return {"like_count": like_count}
    except Exception as e:
        raise HTTPException(status_code=404, detail="Project not found")


@app.delete("/api/projects/{project_id}/like")
def unlike_project_endpoint(project_id: str):
    """프로젝트 좋아요 취소"""
    try:
        like_count = unlike_project(project_id)
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
    }


async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return current_user


# ============ Admin API ============


@app.get("/api/admin/reports")
def list_reports(
    status: Optional[str] = None, current_user: dict = Depends(require_admin)
):
    """신고 목록 조회 (관리자)"""
    _ = current_user
    reports = get_reports(status=status)
    for r in reports:
        r["id"] = str(r["id"])
        if r.get("reporter_id"):
            r["reporter_id"] = str(r["reporter_id"])
    return {"items": reports}


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
        },
    )


@app.get("/api/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """현재 사용자 정보"""
    return current_user


@app.get("/api/me/projects")
def get_my_projects(current_user: dict = Depends(get_current_user)):
    """내 프로젝트 목록"""
    projects = get_user_projects(current_user["id"])
    for p in projects:
        p["id"] = str(p["id"])
        p["author_id"] = str(p["author_id"])
    return {"items": projects}
