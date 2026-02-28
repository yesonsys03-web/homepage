import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Optional
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv(".env")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set. Please check server/.env file")


@contextmanager
def get_db_connection():
    """데이터베이스 연결 컨텍스트 매니저"""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """테이블 초기화 (처음 한 번만 실행)"""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Users 테이블
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR(255) UNIQUE,
                    nickname VARCHAR(100) UNIQUE NOT NULL,
                    bio TEXT,
                    avatar_url VARCHAR(500),
                    role VARCHAR(20) DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)

            # Projects 테이블
            cur.execute("""
                CREATE TABLE IF NOT EXISTS projects (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    author_id UUID REFERENCES users(id),
                    title VARCHAR(255) NOT NULL,
                    summary VARCHAR(500) NOT NULL,
                    description TEXT,
                    thumbnail_url VARCHAR(500),
                    demo_url VARCHAR(500),
                    repo_url VARCHAR(500),
                    platform VARCHAR(50) DEFAULT 'web',
                    status VARCHAR(20) DEFAULT 'published',
                    like_count INTEGER DEFAULT 0,
                    comment_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)

            # Comments 테이블
            cur.execute("""
                CREATE TABLE IF NOT EXISTS comments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                    author_id UUID REFERENCES users(id),
                    parent_id UUID REFERENCES comments(id),
                    content TEXT NOT NULL,
                    status VARCHAR(20) DEFAULT 'visible',
                    like_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)

            # Reports 테이블
            cur.execute("""
                CREATE TABLE IF NOT EXISTS reports (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    target_type VARCHAR(20) NOT NULL,
                    target_id UUID NOT NULL,
                    reporter_id UUID REFERENCES users(id),
                    reason VARCHAR(50) NOT NULL,
                    memo TEXT,
                    status VARCHAR(20) DEFAULT 'open',
                    created_at TIMESTAMP DEFAULT NOW(),
                    resolved_at TIMESTAMP
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS admin_action_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    admin_id UUID REFERENCES users(id),
                    action_type VARCHAR(50) NOT NULL,
                    target_type VARCHAR(20) NOT NULL,
                    target_id UUID NOT NULL,
                    reason TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS moderation_settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    blocked_keywords TEXT[] DEFAULT '{}',
                    auto_hide_report_threshold INTEGER DEFAULT 3,
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)

            # 기본 사용자 생성 (테스트용)
            cur.execute("""
                INSERT INTO users (id, nickname, role)
                VALUES ('11111111-1111-1111-1111-111111111111', 'devkim', 'admin')
                ON CONFLICT (nickname) DO NOTHING
            """)
            # 컬럼 추가 (password - 해시된 비밀번호)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
            """)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS limited_until TIMESTAMP
            """)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS limited_reason TEXT
            """)
            cur.execute(
                """
                INSERT INTO moderation_settings (id, blocked_keywords, auto_hide_report_threshold)
                VALUES (1, '{}', 3)
                ON CONFLICT (id) DO NOTHING
                """
            )

            # 컬럼 추가 (tags - 배열 타입)
            cur.execute("""
                ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'
            """)

            conn.commit()
            print("✅ Database tables initialized successfully!")
            cur.execute("""
                ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'
            """)

            conn.commit()
            print("✅ Database tables initialized successfully!")
            conn.commit()
            print("✅ Database tables initialized successfully!")


def get_projects(
    sort: str = "latest", platform: Optional[str] = None, tag: Optional[str] = None
):
    """프로젝트 목록 조회"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT p.*, u.nickname as author_nickname
                FROM projects p
                JOIN users u ON p.author_id = u.id
                WHERE p.status = 'published'
            """
            params = []

            if platform:
                query += " AND p.platform = %s"
                params.append(platform)

            if tag:
                query += " AND %s = ANY(p.tags)"
                params.append(tag)

            if sort == "popular":
                query += " ORDER BY p.like_count DESC"
            else:
                query += " ORDER BY p.created_at DESC"

            cur.execute(query, params)
            return cur.fetchall()


def get_project(project_id: str):
    """프로젝트 상세 조회"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT p.*, u.nickname as author_nickname
                FROM projects p
                JOIN users u ON p.author_id = u.id
                WHERE p.id = %s
            """,
                (project_id,),
            )
            return cur.fetchone()


def get_user_projects(user_id: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT p.*, u.nickname as author_nickname
                FROM projects p
                JOIN users u ON p.author_id = u.id
                WHERE p.author_id = %s
                ORDER BY p.created_at DESC
                """,
                (user_id,),
            )
            return cur.fetchall()


def create_project(data: dict):
    """프로젝트 생성"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO projects (author_id, title, summary, description, thumbnail_url, demo_url, repo_url, platform, tags)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """,
                (
                    data.get("author_id", "11111111-1111-1111-1111-111111111111"),
                    data["title"],
                    data["summary"],
                    data.get("description"),
                    data.get("thumbnail_url"),
                    data.get("demo_url"),
                    data.get("repo_url"),
                    data.get("platform", "web"),
                    data.get("tags", []),
                ),
            )
            conn.commit()
            return cur.fetchone()


def like_project(project_id: str):
    """프로젝트 좋아요 증가"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE projects SET like_count = like_count + 1
                WHERE id = %s
                RETURNING like_count
            """,
                (project_id,),
            )
            conn.commit()
            result = cur.fetchone()
            return result["like_count"] if result else 0


def unlike_project(project_id: str):
    """프로젝트 좋아요 취소"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE projects SET like_count = GREATEST(0, like_count - 1)
                WHERE id = %s
                RETURNING like_count
            """,
                (project_id,),
            )
            conn.commit()
            result = cur.fetchone()
            return result["like_count"] if result else 0


def get_comments(project_id: str, sort: str = "latest"):
    """프로젝트 댓글 목록"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT c.*, u.nickname as author_nickname
                FROM comments c
                JOIN users u ON c.author_id = u.id
                WHERE c.project_id = %s AND c.status = 'visible'
            """
            if sort == "popular":
                query += " ORDER BY c.like_count DESC"
            else:
                query += " ORDER BY c.created_at DESC"

            cur.execute(query, (project_id,))
            return cur.fetchall()


def create_comment(
    project_id: str,
    content: str,
    author_id: str = "11111111-1111-1111-1111-111111111111",
):
    """댓글 생성"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 댓글 생성
            cur.execute(
                """
                INSERT INTO comments (project_id, author_id, content)
                VALUES (%s, %s, %s)
                RETURNING *
            """,
                (project_id, author_id, content),
            )
            # 프로젝트 댓글 수 증가
            cur.execute(
                """
                UPDATE projects SET comment_count = comment_count + 1
                WHERE id = %s
            """,
                (project_id,),
            )

            conn.commit()
            return cur.fetchone()


def report_comment(
    comment_id: str,
    reason: str,
    reporter_id: str = "11111111-1111-1111-1111-111111111111",
    memo: Optional[str] = None,
):
    """댓글 신고"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO reports (target_type, target_id, reporter_id, reason, memo)
                VALUES ('comment', %s, %s, %s, %s)
                RETURNING *
            """,
                (comment_id, reporter_id, reason, memo),
            )
            conn.commit()
            return cur.fetchone()


def get_reports(status: Optional[str] = None):
    """신고 목록 (관리자)"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = "SELECT * FROM reports"
            if status:
                query += " WHERE status = %s ORDER BY created_at DESC"
                cur.execute(query, (status,))
            else:
                query += " ORDER BY created_at DESC"
                cur.execute(query)
            return cur.fetchall()


def update_report(report_id: str, new_status: str):
    """신고 처리 상태 변경"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if new_status in ["resolved", "rejected"]:
                cur.execute(
                    """
                    UPDATE reports SET status = %s, resolved_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """,
                    (new_status, report_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE reports SET status = %s
                    WHERE id = %s
                    RETURNING *
                """,
                    (new_status, report_id),
                )
            conn.commit()
            return cur.fetchone()


def create_admin_action_log(
    admin_id: str,
    action_type: str,
    target_type: str,
    target_id: str,
    reason: Optional[str] = None,
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO admin_action_logs (admin_id, action_type, target_type, target_id, reason)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (admin_id, action_type, target_type, target_id, reason),
            )
            conn.commit()
            return cur.fetchone()


def get_admin_action_logs(limit: int = 50):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT l.*, u.nickname as admin_nickname
                FROM admin_action_logs l
                LEFT JOIN users u ON l.admin_id = u.id
                ORDER BY l.created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            return cur.fetchall()


def get_latest_policy_update_action():
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT l.*, u.nickname as admin_nickname
                FROM admin_action_logs l
                LEFT JOIN users u ON l.admin_id = u.id
                WHERE l.action_type = 'policy_updated'
                ORDER BY l.created_at DESC
                LIMIT 1
                """
            )
            return cur.fetchone()


def get_admin_users(limit: int = 200):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, email, nickname, role, created_at, limited_until, limited_reason
                FROM users
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            return cur.fetchall()


def limit_user(user_id: str, hours: int = 24, reason: Optional[str] = None):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET limited_until = NOW() + (%s || ' hours')::INTERVAL,
                    limited_reason = %s
                WHERE id = %s AND role != 'admin'
                RETURNING id, email, nickname, role, created_at, limited_until, limited_reason
                """,
                (hours, reason, user_id),
            )
            conn.commit()
            return cur.fetchone()


def unlimit_user(user_id: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET limited_until = NULL,
                    limited_reason = NULL
                WHERE id = %s AND role != 'admin'
                RETURNING id, email, nickname, role, created_at, limited_until, limited_reason
                """,
                (user_id,),
            )
            conn.commit()
            return cur.fetchone()


def get_moderation_settings():
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, blocked_keywords, auto_hide_report_threshold, updated_at
                FROM moderation_settings
                WHERE id = 1
                """
            )
            return cur.fetchone()


def update_moderation_settings(
    blocked_keywords: list[str],
    auto_hide_report_threshold: int,
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE moderation_settings
                SET blocked_keywords = %s,
                    auto_hide_report_threshold = %s,
                    updated_at = NOW()
                WHERE id = 1
                RETURNING id, blocked_keywords, auto_hide_report_threshold, updated_at
                """,
                (blocked_keywords, auto_hide_report_threshold),
            )
            conn.commit()
            return cur.fetchone()


def create_user(email: str, nickname: str, password_hash: str):
    """사용자 생성 (회원가입)"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO users (email, nickname, password_hash)
                VALUES (%s, %s, %s)
                RETURNING id, email, nickname, role, created_at
            """,
                (email, nickname, password_hash),
            )
            conn.commit()
            return cur.fetchone()


def get_user_by_email(email: str):
    """이메일로 사용자 조회"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, email, nickname, password_hash, role, avatar_url, bio, created_at
                FROM users WHERE email = %s
            """,
                (email,),
            )
            return cur.fetchone()


def get_user_by_nickname(nickname: str):
    """닉네임으로 사용자 조회"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, email, nickname, role, avatar_url, bio, created_at
                FROM users WHERE nickname = %s
            """,
                (nickname,),
            )
            return cur.fetchone()


def get_user_by_id(user_id: str):
    """ID로 사용자 조회"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, email, nickname, role, avatar_url, bio, created_at
                FROM users WHERE id = %s
            """,
                (user_id,),
            )
            return cur.fetchone()
