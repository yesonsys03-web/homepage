from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

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
)

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


# ============ Startup Event ============

@app.on_event("startup")
async def startup_event():
    """앱 시작 시 DB 테이블 초기화"""
    try:
        init_db()
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
            p['id'] = str(p['id'])
            p['author_id'] = str(p['author_id'])
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
    project['id'] = str(project['id'])
    project['author_id'] = str(project['author_id'])
    return project


@app.post("/api/projects")
def create_project_endpoint(project: ProjectCreate):
    """프로젝트 생성"""
    new_project = create_project(project.model_dump())
    new_project['id'] = str(new_project['id'])
    new_project['author_id'] = str(new_project['author_id'])
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
        c['id'] = str(c['id'])
        c['project_id'] = str(c['project_id'])
        c['author_id'] = str(c['author_id'])
        if c.get('parent_id'):
            c['parent_id'] = str(c['parent_id'])
    return {"items": comments}


@app.post("/api/projects/{project_id}/comments")
def create_comment_endpoint(project_id: str, comment: CommentCreate):
    """댓글 작성"""
    new_comment = create_comment(project_id, comment.content)
    new_comment['id'] = str(new_comment['id'])
    new_comment['project_id'] = str(new_comment['project_id'])
    new_comment['author_id'] = str(new_comment['author_id'])
    return new_comment


# ============ Reports API ============

@app.post("/api/comments/{comment_id}/report")
def report_comment_endpoint(comment_id: str, report: ReportCreate):
    """댓글 신고"""
    new_report = report_comment(
        comment_id=comment_id,
        reason=report.reason,
        memo=report.memo
    )
    new_report['id'] = str(new_report['id'])
    new_report['reporter_id'] = str(new_report['reporter_id'])
    return new_report


# ============ Admin API ============

@app.get("/api/admin/reports")
def list_reports(status: Optional[str] = None):
    """신고 목록 조회 (관리자)"""
    reports = get_reports(status=status)
    for r in reports:
        r['id'] = str(r['id'])
        if r.get('reporter_id'):
            r['reporter_id'] = str(r['reporter_id'])
    return {"items": reports}


@app.patch("/api/admin/reports/{report_id}")
def update_report_endpoint(report_id: str, new_status: str):
    """신고 처리 상태 변경 (관리자)"""
    updated = update_report(report_id, new_status)
    updated['id'] = str(updated['id'])
    if updated.get('reporter_id'):
        updated['reporter_id'] = str(updated['reporter_id'])
    return updated


# ============ User API (MVP) ============

@app.get("/api/me/projects")
def get_my_projects():
    """내 프로젝트 목록"""
    # TODO: 실제 사용자 ID로 변경
    return {"items": []}
