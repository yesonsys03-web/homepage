from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

app = FastAPI(title="VibeCoder Playground API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Models ============


class ProjectBase(BaseModel):
    title: str
    summary: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    demo_url: Optional[str] = None
    repo_url: Optional[str] = None
    platform: str = "web"
    tags: list[str] = []


class ProjectCreate(ProjectBase):
    pass


class Project(ProjectBase):
    id: str
    author_id: str
    author_nickname: str
    like_count: int = 0
    comment_count: int = 0
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    project_id: str


class Comment(CommentBase):
    id: str
    project_id: str
    author_id: str
    author_nickname: str
    parent_id: Optional[str] = None
    like_count: int = 0
    status: str = "visible"
    created_at: str

    class Config:
        from_attributes = True


class ReportCreate(BaseModel):
    target_type: str  # "project" or "comment"
    target_id: str
    reason: str  # "spam", "abuse", "adult", "other"
    memo: Optional[str] = None


class Report(ReportCreate):
    id: str
    reporter_id: str
    status: str = "open"  # "open", "reviewing", "resolved", "rejected"
    created_at: str
    resolved_at: Optional[str] = None

    class Config:
        from_attributes = True


# ============ In-Memory Database (MVP) ============

# 샘플 프로젝트 데이터
projects_db: dict[str, Project] = {
    "1": Project(
        id="1",
        title="AI Music Generator",
        summary="AI를 활용하여 음악을 생성하는 도구입니다.",
        description="이 프로젝트는 AI를 활용하여 사용자가 간단한 프롬프트만으로 나만의 음악을 생성할 수 있게 해줍니다.",
        thumbnail_url=None,
        demo_url="https://example.com",
        repo_url="https://github.com/example",
        platform="Web",
        tags=["AI", "Music"],
        author_id="1",
        author_nickname="devkim",
        like_count=128,
        comment_count=32,
        created_at="2026-02-20T10:00:00Z",
        updated_at="2026-02-20T10:00:00Z",
    ),
    "2": Project(
        id="2",
        title="React Dashboard",
        summary="모던한 관리자 대시보드",
        description=" Tailwind CSS로 만든 현대적인 관리자 대시보드 템플릿입니다.",
        thumbnail_url=None,
        demo_url="https://example2.com",
        repo_url="https://github.com/example2",
        platform="Web",
        tags=["React", "UI", "Dashboard"],
        author_id="2",
        author_nickname="codemaster",
        like_count=89,
        comment_count=15,
        created_at="2026-02-15T10:00:00Z",
        updated_at="2026-02-15T10:00:00Z",
    ),
    "3": Project(
        id="3",
        title="Python Automation",
        summary="자동화 스크립트 모음",
        description="일상적인 작업을 자동화하는 Python 스크립트 모음입니다.",
        thumbnail_url=None,
        demo_url=None,
        repo_url="https://github.com/example3",
        platform="Tool",
        tags=["Python", "Automation"],
        author_id="3",
        author_nickname="pypro",
        like_count=67,
        comment_count=8,
        created_at="2026-02-10T10:00:00Z",
        updated_at="2026-02-10T10:00:00Z",
    ),
    "4": Project(
        id="4",
        title="Three.js Game",
        summary="3D 브라우저 게임",
        description="Three.js로 만든 인터랙티브 3D 게임입니다.",
        thumbnail_url=None,
        demo_url="https://example4.com",
        repo_url="https://github.com/example4",
        platform="Game",
        tags=["Three.js", "Game", "3D"],
        author_id="4",
        author_nickname="gamedev",
        like_count=156,
        comment_count=42,
        created_at="2026-02-18T10:00:00Z",
        updated_at="2026-02-18T10:00:00Z",
    ),
}

# 샘플 댓글 데이터
comments_db: dict[str, Comment] = {
    "1": Comment(
        id="1",
        project_id="1",
        author_id="5",
        author_nickname="coder01",
        content="정말 amazing해요! 어떻게 만드셨나요?",
        like_count=12,
        created_at="2026-02-21T10:00:00Z",
    ),
    "2": Comment(
        id="2",
        project_id="1",
        author_id="6",
        author_nickname="musicfan",
        content="음악 생성이 이렇게 쉽게 될 줄이야...",
        like_count=8,
        created_at="2026-02-21T11:00:00Z",
    ),
    "3": Comment(
        id="3",
        project_id="1",
        author_id="7",
        author_nickname="aidev",
        content="코드 공개해주실 수 있나요?",
        like_count=5,
        created_at="2026-02-21T12:00:00Z",
    ),
}

# 샘플 신고 데이터
reports_db: dict[str, Report] = {}


# ============ Health Check ============


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ============ Projects API ============


@app.get("/api/projects")
def get_projects(
    sort: str = "latest",  # "latest" or "popular"
    platform: Optional[str] = None,
    tag: Optional[str] = None,
) -> dict:
    """프로젝트 목록 조회"""
    projects = list(projects_db.values())

    # 필터 적용
    if platform:
        projects = [p for p in projects if p.platform.lower() == platform.lower()]
    if tag:
        projects = [p for p in projects if tag.lower() in [t.lower() for t in p.tags]]

    # 정렬
    if sort == "popular":
        projects = sorted(projects, key=lambda p: p.like_count, reverse=True)
    else:
        projects = sorted(projects, key=lambda p: p.created_at, reverse=True)

    return {"items": projects, "next_cursor": None}


@app.get("/api/projects/{project_id}")
def get_project(project_id: str) -> Project:
    """프로젝트 상세 조회"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    return projects_db[project_id]


@app.post("/api/projects")
def create_project(project: ProjectCreate) -> Project:
    """프로젝트 생성"""
    now = datetime.utcnow().isoformat() + "Z"
    new_project = Project(
        id=str(uuid.uuid4()),
        author_id="1",  # TODO: 실제 사용자 ID
        author_nickname="devkim",  # TODO: 실제 닉네임
        like_count=0,
        comment_count=0,
        created_at=now,
        updated_at=now,
        **project.model_dump(),
    )
    projects_db[new_project.id] = new_project
    return new_project


@app.post("/api/projects/{project_id}/like")
def like_project(project_id: str) -> dict:
    """프로젝트 좋아요"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    projects_db[project_id].like_count += 1
    return {"like_count": projects_db[project_id].like_count}


@app.delete("/api/projects/{project_id}/like")
def unlike_project(project_id: str) -> dict:
    """프로젝트 좋아요 취소"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    projects_db[project_id].like_count = max(0, projects_db[project_id].like_count - 1)
    return {"like_count": projects_db[project_id].like_count}


# ============ Comments API ============


@app.get("/api/projects/{project_id}/comments")
def get_comments(
    project_id: str,
    sort: str = "latest",  # "latest" or "popular"
) -> dict:
    """프로젝트 댓글 목록 조회"""
    comments = [c for c in comments_db.values() if c.project_id == project_id]

    if sort == "popular":
        comments = sorted(comments, key=lambda c: c.like_count, reverse=True)
    else:
        comments = sorted(comments, key=lambda c: c.created_at, reverse=True)

    return {"items": comments}


@app.post("/api/projects/{project_id}/comments")
def create_comment(project_id: str, comment: CommentCreate) -> Comment:
    """댓글 작성"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")

    now = datetime.utcnow().isoformat() + "Z"
    new_comment = Comment(
        id=str(uuid.uuid4()),
        project_id=project_id,
        author_id="1",
        author_nickname="devkim",
        like_count=0,
        created_at=now,
        **comment.model_dump(),
    )
    comments_db[new_comment.id] = new_comment

    # 프로젝트 댓글 수 증가
    projects_db[project_id].comment_count += 1

    return new_comment


# ============ Reports API ============


@app.post("/api/comments/{comment_id}/report")
def report_comment(comment_id: str, report: ReportCreate) -> Report:
    """댓글 신고"""
    now = datetime.utcnow().isoformat() + "Z"
    new_report = Report(
        id=str(uuid.uuid4()),
        reporter_id="1",  # TODO: 실제 사용자 ID
        created_at=now,
        **report.model_dump(),
    )
    reports_db[new_report.id] = new_report
    return new_report


# ============ Admin API ============


@app.get("/api/admin/reports")
def get_reports(
    status: Optional[str] = None,
) -> dict:
    """신고 목록 조회 (관리자)"""
    reports = list(reports_db.values())

    if status:
        reports = [r for r in reports if r.status == status]

    reports = sorted(reports, key=lambda r: r.created_at, reverse=True)

    return {"items": reports}


@app.patch("/api/admin/reports/{report_id}")
def update_report(report_id: str, status: str) -> Report:
    """신고 처리 상태 변경 (관리자)"""
    if report_id not in reports_db:
        raise HTTPException(status_code=404, detail="Report not found")

    reports_db[report_id].status = status

    if status in ["resolved", "rejected"]:
        reports_db[report_id].resolved_at = datetime.utcnow().isoformat() + "Z"

    return reports_db[report_id]


# ============ User API (MVP) ============


@app.get("/api/me/projects")
def get_my_projects() -> dict:
    """내 프로젝트 목록"""
    user_id = "1"  # TODO: 실제 사용자 ID
    my_projects = [p for p in projects_db.values() if p.author_id == user_id]
    return {"items": my_projects}
