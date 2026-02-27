import os
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
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
            
            # 기본 사용자 생성 (테스트용)
            cur.execute("""
                INSERT INTO users (id, nickname, role)
                VALUES ('11111111-1111-1111-1111-111111111111', 'devkim', 'admin')
                ON CONFLICT (nickname) DO NOTHING
            """)
            # 컬럼 추가 (tags - 배열 타입)
            cur.execute("""
                ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'
            """)
            
            conn.commit()
            print("✅ Database tables initialized successfully!")
            conn.commit()
            print("✅ Database tables initialized successfully!")


def get_projects(sort: str = "latest", platform: str = None, tag: str = None):
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
            cur.execute("""
                SELECT p.*, u.nickname as author_nickname
                FROM projects p
                JOIN users u ON p.author_id = u.id
                WHERE p.id = %s
            """, (project_id,))
            return cur.fetchone()


def create_project(data: dict):
    """프로젝트 생성"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO projects (author_id, title, summary, description, thumbnail_url, demo_url, repo_url, platform, tags)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                data.get('author_id', '11111111-1111-1111-1111-111111111111'),
                data['title'],
                data['summary'],
                data.get('description'),
                data.get('thumbnail_url'),
                data.get('demo_url'),
                data.get('repo_url'),
                data.get('platform', 'web'),
                data.get('tags', [])
            ))
            conn.commit()
            return cur.fetchone()


def like_project(project_id: str):
    """프로젝트 좋아요 증가"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE projects SET like_count = like_count + 1
                WHERE id = %s
                RETURNING like_count
            """, (project_id,))
            conn.commit()
            result = cur.fetchone()
            return result['like_count'] if result else 0


def unlike_project(project_id: str):
    """프로젝트 좋아요 취소"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE projects SET like_count = GREATEST(0, like_count - 1)
                WHERE id = %s
                RETURNING like_count
            """, (project_id,))
            conn.commit()
            result = cur.fetchone()
            return result['like_count'] if result else 0


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


def create_comment(project_id: str, content: str, author_id: str = '11111111-1111-1111-1111-111111111111'):
    """댓글 생성"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 댓글 생성
            cur.execute("""
                INSERT INTO comments (project_id, author_id, content)
                VALUES (%s, %s, %s)
                RETURNING *
            """, (project_id, author_id, content))
            # 프로젝트 댓글 수 증가
            cur.execute("""
                UPDATE projects SET comment_count = comment_count + 1
                WHERE id = %s
            """, (project_id,))
            
            conn.commit()
            return cur.fetchone()


def report_comment(comment_id: str, reason: str, reporter_id: str = '11111111-1111-1111-1111-111111111111', memo: str = None):
    """댓글 신고"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO reports (target_type, target_id, reporter_id, reason, memo)
                VALUES ('comment', %s, %s, %s, %s)
                RETURNING *
            """, (comment_id, reporter_id, reason, memo))
            conn.commit()
            return cur.fetchone()


def get_reports(status: str = None):
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
                cur.execute("""
                    UPDATE reports SET status = %s, resolved_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (new_status, report_id))
            else:
                cur.execute("""
                    UPDATE reports SET status = %s
                    WHERE id = %s
                    RETURNING *
                """, (new_status, report_id))
            conn.commit()
            return cur.fetchone()
