# pyright: reportUnknownVariableType=false, reportUnknownMemberType=false, reportUnknownArgumentType=false, reportUnknownParameterType=false, reportMissingParameterType=false, reportDeprecated=false

import os
import hashlib
from psycopg2.extras import Json, RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
from typing import Mapping, Optional
from dotenv import load_dotenv
from threading import Lock

# .env 파일 로드
_ = load_dotenv(".env")

DATABASE_URL = os.getenv("DATABASE_URL")
DB_POOL_MIN_CONN = int(os.getenv("DB_POOL_MIN_CONN", "1"))
DB_POOL_MAX_CONN = int(os.getenv("DB_POOL_MAX_CONN", "12"))

_db_pool: SimpleConnectionPool | None = None
_db_pool_lock = Lock()

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set. Please check server/.env file")


@contextmanager
def get_db_connection():
    """데이터베이스 연결 컨텍스트 매니저"""
    global _db_pool

    if _db_pool is None:
        with _db_pool_lock:
            if _db_pool is None:
                _db_pool = SimpleConnectionPool(
                    minconn=DB_POOL_MIN_CONN,
                    maxconn=DB_POOL_MAX_CONN,
                    dsn=DATABASE_URL,
                )

    conn = _db_pool.getconn()
    try:
        yield conn
    finally:
        _db_pool.putconn(conn)


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
                    status VARCHAR(20) DEFAULT 'active',
                    provider VARCHAR(20) DEFAULT 'local',
                    provider_user_id VARCHAR(255),
                    email_verified BOOLEAN DEFAULT FALSE,
                    suspended_reason TEXT,
                    suspended_at TIMESTAMP,
                    suspended_by UUID REFERENCES users(id),
                    delete_scheduled_at TIMESTAMP,
                    deleted_at TIMESTAMP,
                    deleted_by UUID REFERENCES users(id),
                    token_version INTEGER DEFAULT 0,
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

            cur.execute("""
                CREATE TABLE IF NOT EXISTS project_likes (
                    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    PRIMARY KEY (project_id, user_id)
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
                    home_filter_tabs JSONB DEFAULT '[]'::jsonb,
                    explore_filter_tabs JSONB DEFAULT '[]'::jsonb,
                    admin_log_retention_days INTEGER DEFAULT 365,
                    admin_log_view_window_days INTEGER DEFAULT 30,
                    admin_log_mask_reasons BOOLEAN DEFAULT TRUE,
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS site_contents (
                    content_key VARCHAR(100) PRIMARY KEY,
                    content_json JSONB NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS page_documents_current (
                    page_id VARCHAR(100) PRIMARY KEY,
                    draft_version INTEGER NOT NULL DEFAULT 0,
                    published_version INTEGER NOT NULL DEFAULT 0,
                    updated_by UUID REFERENCES users(id),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS page_document_versions (
                    page_id VARCHAR(100) NOT NULL,
                    version INTEGER NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    document_json JSONB NOT NULL,
                    reason TEXT,
                    created_by UUID REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT NOW(),
                    PRIMARY KEY (page_id, version)
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS oauth_runtime_settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    google_oauth_enabled BOOLEAN DEFAULT FALSE,
                    google_redirect_uri TEXT,
                    google_frontend_redirect_uri TEXT,
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS oauth_state_tokens (
                    state_hash VARCHAR(64) PRIMARY KEY,
                    expires_at TIMESTAMP NOT NULL,
                    consumed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)

            # 기본 사용자 생성 (테스트용)
            cur.execute(
                """
                INSERT INTO users (id, nickname, role)
                VALUES ('11111111-1111-1111-1111-111111111111', 'devkim', 'admin')
                ON CONFLICT DO NOTHING
                """
            )
            cur.execute(
                """
                UPDATE users
                SET role = 'super_admin',
                    status = 'active',
                    updated_at = NOW()
                WHERE lower(email) = lower(%s)
                """,
                ("topyeson@gmail.com",),
            )
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
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
            """)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'local'
            """)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_user_id VARCHAR(255)
            """)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE
            """)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT
            """)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP
            """)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES users(id)
            """)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS delete_scheduled_at TIMESTAMP
            """)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP
            """)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id)
            """)
            cur.execute("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0
            """)
            cur.execute("""
                UPDATE users SET status = 'active' WHERE status IS NULL
            """)
            cur.execute("""
                UPDATE users SET token_version = 0 WHERE token_version IS NULL
            """)
            cur.execute("""
                UPDATE users SET provider = 'local' WHERE provider IS NULL
            """)
            cur.execute(
                """
                INSERT INTO moderation_settings (id, blocked_keywords, auto_hide_report_threshold)
                VALUES (1, '{}', 3)
                ON CONFLICT (id) DO NOTHING
                """
            )
            cur.execute(
                """
                ALTER TABLE moderation_settings
                ADD COLUMN IF NOT EXISTS home_filter_tabs JSONB DEFAULT '[]'::jsonb
                """
            )
            cur.execute(
                """
                ALTER TABLE moderation_settings
                ADD COLUMN IF NOT EXISTS explore_filter_tabs JSONB DEFAULT '[]'::jsonb
                """
            )
            cur.execute(
                """
                ALTER TABLE moderation_settings
                ADD COLUMN IF NOT EXISTS admin_log_retention_days INTEGER DEFAULT 365
                """
            )
            cur.execute(
                """
                ALTER TABLE moderation_settings
                ADD COLUMN IF NOT EXISTS admin_log_view_window_days INTEGER DEFAULT 30
                """
            )
            cur.execute(
                """
                ALTER TABLE moderation_settings
                ADD COLUMN IF NOT EXISTS admin_log_mask_reasons BOOLEAN DEFAULT TRUE
                """
            )
            cur.execute(
                """
                INSERT INTO oauth_runtime_settings (id, google_oauth_enabled)
                VALUES (1, FALSE)
                ON CONFLICT (id) DO NOTHING
                """
            )

            # 컬럼 추가 (tags - 배열 타입)
            cur.execute("""
                ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_projects_status_created_at
                ON projects (status, created_at DESC)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_projects_status_like_count
                ON projects (status, like_count DESC)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_projects_status_platform_created_at
                ON projects (status, platform, created_at DESC)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_projects_tags_gin
                ON projects USING GIN (tags)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_project_likes_user_id_created_at
                ON project_likes (user_id, created_at DESC)
            """)
            cur.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_provider_user_id
                ON users (provider, provider_user_id)
                WHERE provider_user_id IS NOT NULL
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_oauth_state_tokens_expires_at
                ON oauth_state_tokens (expires_at)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_oauth_state_tokens_consumed_at
                ON oauth_state_tokens (consumed_at)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at
                ON admin_action_logs (created_at DESC)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target
                ON admin_action_logs (target_type, target_id)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_type
                ON admin_action_logs (action_type)
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_page_document_versions_page_created_at
                ON page_document_versions (page_id, created_at DESC)
            """)

            conn.commit()
            print("✅ Database tables initialized successfully!")


def ensure_site_contents_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS site_contents (
            content_key VARCHAR(100) PRIMARY KEY,
            content_json JSONB NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW()
        )
        """
    )


def ensure_page_documents_tables(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS page_documents_current (
            page_id VARCHAR(100) PRIMARY KEY,
            draft_version INTEGER NOT NULL DEFAULT 0,
            published_version INTEGER NOT NULL DEFAULT 0,
            updated_by UUID REFERENCES users(id),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS page_document_versions (
            page_id VARCHAR(100) NOT NULL,
            version INTEGER NOT NULL,
            status VARCHAR(20) NOT NULL,
            document_json JSONB NOT NULL,
            reason TEXT,
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (page_id, version)
        )
        """
    )


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
                query += " AND LOWER(p.platform) = LOWER(%s)"
                params.append(platform)

            if tag:
                query += " AND EXISTS (SELECT 1 FROM unnest(p.tags) AS t WHERE LOWER(t) = LOWER(%s))"
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


def get_admin_projects(status: Optional[str] = None, limit: int = 200):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT p.*, u.nickname as author_nickname
                FROM projects p
                JOIN users u ON p.author_id = u.id
            """
            params = []

            if status and status != "all":
                query += " WHERE p.status = %s"
                params.append(status)

            query += " ORDER BY p.created_at DESC LIMIT %s"
            params.append(limit)
            cur.execute(query, params)
            return cur.fetchall()


def update_project_admin(project_id: str, updates: dict[str, object]):
    allowed_fields = [
        "title",
        "summary",
        "description",
        "thumbnail_url",
        "demo_url",
        "repo_url",
        "platform",
        "tags",
        "status",
    ]
    fields_to_update = []
    params = []

    for field in allowed_fields:
        if field in updates and updates[field] is not None:
            fields_to_update.append(f"{field} = %s")
            params.append(updates[field])

    if not fields_to_update:
        return None

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = f"""
                UPDATE projects
                SET {", ".join(fields_to_update)}, updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """
            params.append(project_id)
            cur.execute(query, params)
            conn.commit()
            return cur.fetchone()


def update_project_owner_fields(project_id: str, updates: dict[str, object]):
    allowed_fields = [
        "title",
        "summary",
        "description",
        "thumbnail_url",
        "demo_url",
        "repo_url",
        "platform",
        "tags",
    ]
    fields_to_update = []
    params = []

    for field in allowed_fields:
        if field in updates and updates[field] is not None:
            fields_to_update.append(f"{field} = %s")
            params.append(updates[field])

    if not fields_to_update:
        return None

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = f"""
                UPDATE projects
                SET {", ".join(fields_to_update)}, updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """
            params.append(project_id)
            cur.execute(query, params)
            conn.commit()
            return cur.fetchone()


def set_project_status(project_id: str, status: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE projects
                SET status = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (status, project_id),
            )
            conn.commit()
            return cur.fetchone()


def create_project(data: dict[str, object]):
    """프로젝트 생성"""
    author_id = data.get("author_id")
    if not author_id:
        raise ValueError("author_id is required to create project")

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO projects (author_id, title, summary, description, thumbnail_url, demo_url, repo_url, platform, tags)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """,
                (
                    author_id,
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


def like_project(project_id: str, user_id: str):
    """프로젝트 좋아요 증가"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO project_likes (project_id, user_id)
                VALUES (%s, %s)
                ON CONFLICT (project_id, user_id) DO NOTHING
                RETURNING project_id
                """,
                (project_id, user_id),
            )

            inserted = cur.fetchone()
            if inserted:
                cur.execute(
                    """
                    UPDATE projects SET like_count = like_count + 1
                    WHERE id = %s
                    RETURNING like_count
                    """,
                    (project_id,),
                )
            else:
                cur.execute(
                    """
                    SELECT like_count
                    FROM projects
                    WHERE id = %s
                    """,
                    (project_id,),
                )

            conn.commit()
            result = cur.fetchone()
            return result["like_count"] if result else 0


def unlike_project(project_id: str, user_id: str):
    """프로젝트 좋아요 취소"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                DELETE FROM project_likes
                WHERE project_id = %s AND user_id = %s
                RETURNING project_id
                """,
                (project_id, user_id),
            )

            deleted = cur.fetchone()
            if deleted:
                cur.execute(
                    """
                    UPDATE projects SET like_count = GREATEST(0, like_count - 1)
                    WHERE id = %s
                    RETURNING like_count
                    """,
                    (project_id,),
                )
            else:
                cur.execute(
                    """
                    SELECT like_count
                    FROM projects
                    WHERE id = %s
                    """,
                    (project_id,),
                )

            conn.commit()
            result = cur.fetchone()
            return result["like_count"] if result else 0


def get_user_comments(user_id: str, limit: int = 50):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT c.*, p.title as project_title
                FROM comments c
                JOIN projects p ON p.id = c.project_id
                WHERE c.author_id = %s
                ORDER BY c.created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            return cur.fetchall()


def get_user_liked_projects(user_id: str, limit: int = 50):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT p.*, u.nickname as author_nickname, pl.created_at as liked_at
                FROM project_likes pl
                JOIN projects p ON p.id = pl.project_id
                JOIN users u ON u.id = p.author_id
                WHERE pl.user_id = %s
                ORDER BY pl.created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            return cur.fetchall()


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
    author_id: str,
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


def get_reports(status: Optional[str] = None, limit: int = 50, offset: int = 0):
    """신고 목록 (관리자)"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = "SELECT * FROM reports"
            params: list[object] = []
            if status:
                query += " WHERE status = %s ORDER BY created_at DESC"
                params.append(status)
            else:
                query += " ORDER BY created_at DESC"

            query += " LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            cur.execute(query, params)
            return cur.fetchall()


def get_reports_count(status: Optional[str] = None):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if status:
                cur.execute(
                    "SELECT COUNT(*) AS count FROM reports WHERE status = %s", (status,)
                )
            else:
                cur.execute("SELECT COUNT(*) AS count FROM reports")

            result = cur.fetchone()
            return int(result["count"]) if result else 0


def get_admin_stats():
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                WITH bounds AS (
                    SELECT
                        date_trunc('week', NOW()) AS this_week_start,
                        date_trunc('week', NOW()) - INTERVAL '7 day' AS last_week_start
                )
                SELECT
                    (SELECT COUNT(*)::int FROM users) AS total_users,
                    (
                        SELECT COUNT(*)::int
                        FROM users
                        WHERE created_at >= (SELECT this_week_start FROM bounds)
                    ) AS users_this_week,
                    (
                        SELECT COUNT(*)::int
                        FROM users
                        WHERE created_at >= (SELECT last_week_start FROM bounds)
                          AND created_at < (SELECT this_week_start FROM bounds)
                    ) AS users_last_week,
                    (SELECT COUNT(*)::int FROM projects) AS total_projects,
                    (
                        SELECT COUNT(*)::int
                        FROM projects
                        WHERE created_at >= (SELECT this_week_start FROM bounds)
                    ) AS projects_this_week,
                    (
                        SELECT COUNT(*)::int
                        FROM projects
                        WHERE created_at >= (SELECT last_week_start FROM bounds)
                          AND created_at < (SELECT this_week_start FROM bounds)
                    ) AS projects_last_week,
                    (
                        SELECT COUNT(*)::int
                        FROM reports
                        WHERE status = 'open'
                    ) AS open_reports,
                    (
                        SELECT COUNT(*)::int
                        FROM users
                        WHERE status = 'pending'
                    ) AS pending_user_approvals
                """
            )
            summary = cur.fetchone() or {}

            cur.execute(
                """
                WITH week_days AS (
                    SELECT generate_series(
                        date_trunc('week', NOW()),
                        date_trunc('week', NOW()) + INTERVAL '6 day',
                        INTERVAL '1 day'
                    )::date AS day
                )
                SELECT
                    wd.day,
                    COALESCE(u.count, 0)::int AS new_users,
                    COALESCE(p.count, 0)::int AS new_projects
                FROM week_days wd
                LEFT JOIN (
                    SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
                    FROM users
                    WHERE created_at >= date_trunc('week', NOW())
                    GROUP BY 1
                ) u ON wd.day = u.day
                LEFT JOIN (
                    SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
                    FROM projects
                    WHERE created_at >= date_trunc('week', NOW())
                    GROUP BY 1
                ) p ON wd.day = p.day
                ORDER BY wd.day ASC
                """
            )
            weekly_rows = cur.fetchall() or []

            users_this_week = int(summary.get("users_this_week") or 0)
            users_last_week = int(summary.get("users_last_week") or 0)
            projects_this_week = int(summary.get("projects_this_week") or 0)
            projects_last_week = int(summary.get("projects_last_week") or 0)

            return {
                "total_users": int(summary.get("total_users") or 0),
                "total_projects": int(summary.get("total_projects") or 0),
                "open_reports": int(summary.get("open_reports") or 0),
                "pending_user_approvals": int(
                    summary.get("pending_user_approvals") or 0
                ),
                "users_this_week": users_this_week,
                "users_last_week": users_last_week,
                "projects_this_week": projects_this_week,
                "projects_last_week": projects_last_week,
                "users_week_delta": users_this_week - users_last_week,
                "projects_week_delta": projects_this_week - projects_last_week,
                "weekly_trend": [
                    {
                        "day": row["day"].isoformat(),
                        "new_users": int(row["new_users"] or 0),
                        "new_projects": int(row["new_projects"] or 0),
                    }
                    for row in weekly_rows
                ],
            }


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


def get_admin_action_logs(limit: int = 50, view_window_days: Optional[int] = None):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if view_window_days and view_window_days > 0:
                cur.execute(
                    """
                    SELECT l.*, u.nickname as admin_nickname
                    FROM admin_action_logs l
                    LEFT JOIN users u ON l.admin_id = u.id
                    WHERE l.created_at >= NOW() - (%s * INTERVAL '1 day')
                    ORDER BY l.created_at DESC
                    LIMIT %s
                    """,
                    (view_window_days, limit),
                )
            else:
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


def cleanup_admin_action_logs(retention_days: int) -> int:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM admin_action_logs
                WHERE created_at < NOW() - (%s * INTERVAL '1 day')
                """,
                (retention_days,),
            )
            deleted_count = cur.rowcount
            conn.commit()
            return deleted_count


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
                SELECT id, email, nickname, role, status, created_at, limited_until, limited_reason,
                       suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                FROM users
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            return cur.fetchall()


def limit_user(
    user_id: str,
    hours: int = 24,
    reason: Optional[str] = None,
    allow_admin_target: bool = False,
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET limited_until = NOW() + (%s || ' hours')::INTERVAL,
                    limited_reason = %s
                WHERE id = %s
                  AND role != 'super_admin'
                  AND (%s OR role != 'admin')
                RETURNING id, email, nickname, role, status, created_at, limited_until, limited_reason,
                          suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                """,
                (hours, reason, user_id, allow_admin_target),
            )
            conn.commit()
            return cur.fetchone()


def unlimit_user(user_id: str, allow_admin_target: bool = False):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET limited_until = NULL,
                    limited_reason = NULL
                WHERE id = %s
                  AND role != 'super_admin'
                  AND (%s OR role != 'admin')
                RETURNING id, email, nickname, role, status, created_at, limited_until, limited_reason,
                          suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                """,
                (user_id, allow_admin_target),
            )
            conn.commit()
            return cur.fetchone()


def approve_user(user_id: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET status = 'active',
                    suspended_reason = NULL,
                    suspended_at = NULL,
                    suspended_by = NULL,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, email, nickname, role, status, created_at, limited_until, limited_reason,
                          suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                """,
                (user_id,),
            )
            conn.commit()
            return cur.fetchone()


def reject_user(user_id: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET status = 'rejected', updated_at = NOW()
                WHERE id = %s
                RETURNING id, email, nickname, role, status, created_at, limited_until, limited_reason,
                          suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                """,
                (user_id,),
            )
            conn.commit()
            return cur.fetchone()


def set_user_role(user_id: str, role: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET role = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, email, nickname, role, status, created_at, limited_until, limited_reason,
                          suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                """,
                (role, user_id),
            )
            conn.commit()
            return cur.fetchone()


def suspend_user(
    user_id: str,
    admin_id: str,
    reason: str,
    allow_admin_target: bool = False,
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET status = 'suspended',
                    suspended_reason = %s,
                    suspended_at = NOW(),
                    suspended_by = %s,
                    token_version = token_version + 1,
                    updated_at = NOW()
                WHERE id = %s
                  AND role != 'super_admin'
                  AND (%s OR role != 'admin')
                RETURNING id, email, nickname, role, status, created_at, limited_until, limited_reason,
                          suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                """,
                (reason, admin_id, user_id, allow_admin_target),
            )
            conn.commit()
            return cur.fetchone()


def unsuspend_user(user_id: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET status = 'active',
                    suspended_reason = NULL,
                    suspended_at = NULL,
                    suspended_by = NULL,
                    updated_at = NOW()
                WHERE id = %s AND role != 'super_admin' AND status = 'suspended'
                RETURNING id, email, nickname, role, status, created_at, limited_until, limited_reason,
                          suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                """,
                (user_id,),
            )
            conn.commit()
            return cur.fetchone()


def revoke_user_tokens(user_id: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET token_version = token_version + 1,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, email, nickname, role, status, created_at, limited_until, limited_reason,
                          suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                """,
                (user_id,),
            )
            conn.commit()
            return cur.fetchone()


def schedule_user_deletion(
    user_id: str,
    admin_id: str,
    days: int,
    reason: str,
    allow_admin_target: bool = False,
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET status = 'pending_delete',
                    delete_scheduled_at = NOW() + (%s * INTERVAL '1 day'),
                    suspended_reason = %s,
                    suspended_at = NOW(),
                    suspended_by = %s,
                    token_version = token_version + 1,
                    updated_at = NOW()
                WHERE id = %s
                  AND role != 'super_admin'
                  AND (%s OR role != 'admin')
                RETURNING id, email, nickname, role, status, created_at, limited_until, limited_reason,
                          suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                """,
                (days, reason, admin_id, user_id, allow_admin_target),
            )
            conn.commit()
            return cur.fetchone()


def cancel_user_deletion(user_id: str, allow_admin_target: bool = False):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET status = 'active',
                    delete_scheduled_at = NULL,
                    suspended_reason = NULL,
                    suspended_at = NULL,
                    suspended_by = NULL,
                    updated_at = NOW()
                WHERE id = %s
                  AND status = 'pending_delete'
                  AND role != 'super_admin'
                  AND (%s OR role != 'admin')
                RETURNING id, email, nickname, role, status, created_at, limited_until, limited_reason,
                          suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                """,
                (user_id, allow_admin_target),
            )
            conn.commit()
            return cur.fetchone()


def delete_user_now(
    user_id: str,
    admin_id: str,
    reason: str,
    allow_admin_target: bool = False,
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET status = 'deleted',
                    deleted_at = NOW(),
                    deleted_by = %s,
                    delete_scheduled_at = NULL,
                    suspended_reason = %s,
                    suspended_at = NOW(),
                    suspended_by = %s,
                    token_version = token_version + 1,
                    updated_at = NOW()
                WHERE id = %s
                  AND role != 'super_admin'
                  AND (%s OR role != 'admin')
                RETURNING id, email, nickname, role, status, created_at, limited_until, limited_reason,
                          suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                """,
                (admin_id, reason, admin_id, user_id, allow_admin_target),
            )
            conn.commit()
            return cur.fetchone()


def purge_due_user_deletions(limit: int = 200):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET status = 'deleted',
                    deleted_at = NOW(),
                    deleted_by = NULL,
                    delete_scheduled_at = NULL,
                    token_version = token_version + 1,
                    updated_at = NOW()
                WHERE id IN (
                    SELECT id
                    FROM users
                    WHERE status = 'pending_delete'
                      AND delete_scheduled_at IS NOT NULL
                      AND delete_scheduled_at <= NOW()
                    ORDER BY delete_scheduled_at ASC
                    LIMIT %s
                )
                RETURNING id, email, nickname, role, status, created_at, limited_until, limited_reason,
                          suspended_reason, suspended_at, suspended_by, delete_scheduled_at, deleted_at, deleted_by, token_version
                """,
                (limit,),
            )
            rows = cur.fetchall()
            conn.commit()
            return rows


def get_moderation_settings():
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, blocked_keywords, auto_hide_report_threshold, home_filter_tabs, explore_filter_tabs,
                       admin_log_retention_days, admin_log_view_window_days, admin_log_mask_reasons, updated_at
                FROM moderation_settings
                WHERE id = 1
                """
            )
            return cur.fetchone()


def update_moderation_settings(
    blocked_keywords: list[str],
    auto_hide_report_threshold: int,
    home_filter_tabs: list[dict[str, str]],
    explore_filter_tabs: list[dict[str, str]],
    admin_log_retention_days: int,
    admin_log_view_window_days: int,
    admin_log_mask_reasons: bool,
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE moderation_settings
                SET blocked_keywords = %s,
                    auto_hide_report_threshold = %s,
                    home_filter_tabs = %s,
                    explore_filter_tabs = %s,
                    admin_log_retention_days = %s,
                    admin_log_view_window_days = %s,
                    admin_log_mask_reasons = %s,
                    updated_at = NOW()
                WHERE id = 1
                RETURNING id, blocked_keywords, auto_hide_report_threshold, home_filter_tabs, explore_filter_tabs,
                          admin_log_retention_days, admin_log_view_window_days, admin_log_mask_reasons, updated_at
                """,
                (
                    blocked_keywords,
                    auto_hide_report_threshold,
                    Json(home_filter_tabs),
                    Json(explore_filter_tabs),
                    admin_log_retention_days,
                    admin_log_view_window_days,
                    admin_log_mask_reasons,
                ),
            )
            conn.commit()
            return cur.fetchone()


def get_oauth_runtime_settings():
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, google_oauth_enabled, google_redirect_uri, google_frontend_redirect_uri, updated_at
                FROM oauth_runtime_settings
                WHERE id = 1
                """
            )
            return cur.fetchone()


def update_oauth_runtime_settings(
    google_oauth_enabled: bool,
    google_redirect_uri: Optional[str],
    google_frontend_redirect_uri: Optional[str],
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE oauth_runtime_settings
                SET google_oauth_enabled = %s,
                    google_redirect_uri = %s,
                    google_frontend_redirect_uri = %s,
                    updated_at = NOW()
                WHERE id = 1
                RETURNING id, google_oauth_enabled, google_redirect_uri, google_frontend_redirect_uri, updated_at
                """,
                (
                    google_oauth_enabled,
                    google_redirect_uri,
                    google_frontend_redirect_uri,
                ),
            )
            conn.commit()
            return cur.fetchone()


def _hash_oauth_state(state: str) -> str:
    return hashlib.sha256(state.encode("utf-8")).hexdigest()


def create_oauth_state_token(state: str, ttl_seconds: int):
    state_hash = _hash_oauth_state(state)
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO oauth_state_tokens (state_hash, expires_at)
                VALUES (%s, NOW() + (%s * INTERVAL '1 second'))
                ON CONFLICT (state_hash) DO UPDATE
                SET expires_at = EXCLUDED.expires_at,
                    consumed_at = NULL
                RETURNING state_hash, expires_at, consumed_at, created_at
                """,
                (state_hash, ttl_seconds),
            )
            conn.commit()
            return cur.fetchone()


def consume_oauth_state_token(state: str) -> bool:
    state_hash = _hash_oauth_state(state)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE oauth_state_tokens
                SET consumed_at = NOW()
                WHERE state_hash = %s
                  AND consumed_at IS NULL
                  AND expires_at > NOW()
                """,
                (state_hash,),
            )
            conn.commit()
            return cur.rowcount == 1


def cleanup_oauth_state_tokens():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM oauth_state_tokens
                WHERE expires_at <= NOW()
                   OR (consumed_at IS NOT NULL AND consumed_at <= NOW() - INTERVAL '1 day')
                """
            )
            conn.commit()


def get_site_content(content_key: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            ensure_site_contents_table(cur)
            cur.execute(
                """
                SELECT content_key, content_json, updated_at
                FROM site_contents
                WHERE content_key = %s
                """,
                (content_key,),
            )
            return cur.fetchone()


def upsert_site_content(content_key: str, content_json: Mapping[str, object]):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            ensure_site_contents_table(cur)
            cur.execute(
                """
                INSERT INTO site_contents (content_key, content_json, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (content_key)
                DO UPDATE SET content_json = EXCLUDED.content_json, updated_at = NOW()
                RETURNING content_key, content_json, updated_at
                """,
                (content_key, Json(content_json)),
            )
            conn.commit()
            return cur.fetchone()


def get_page_document_draft(page_id: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            ensure_page_documents_tables(cur)
            cur.execute(
                """
                SELECT c.page_id,
                       c.draft_version,
                       c.published_version,
                       c.updated_by,
                       c.updated_at,
                       v.document_json
                FROM page_documents_current c
                LEFT JOIN page_document_versions v
                  ON v.page_id = c.page_id AND v.version = c.draft_version
                WHERE c.page_id = %s
                """,
                (page_id,),
            )
            return cur.fetchone()


def save_page_document_draft(
    page_id: str,
    base_version: int,
    document_json: Mapping[str, object],
    actor_id: str,
    reason: Optional[str] = None,
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            ensure_page_documents_tables(cur)
            cur.execute(
                """
                SELECT page_id, draft_version, published_version
                FROM page_documents_current
                WHERE page_id = %s
                FOR UPDATE
                """,
                (page_id,),
            )
            current = cur.fetchone()

            if not current:
                if base_version != 0:
                    conn.rollback()
                    return {
                        "conflict": True,
                        "current_version": 0,
                    }

                saved_version = 1
                cur.execute(
                    """
                    INSERT INTO page_document_versions
                        (page_id, version, status, document_json, reason, created_by, created_at)
                    VALUES (%s, %s, 'draft', %s, %s, %s, NOW())
                    """,
                    (page_id, saved_version, Json(document_json), reason, actor_id),
                )
                cur.execute(
                    """
                    INSERT INTO page_documents_current
                        (page_id, draft_version, published_version, updated_by, updated_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    """,
                    (page_id, saved_version, 0, actor_id),
                )
            else:
                current_version = int(current["draft_version"])
                if base_version != current_version:
                    conn.rollback()
                    return {
                        "conflict": True,
                        "current_version": current_version,
                    }

                saved_version = current_version + 1
                cur.execute(
                    """
                    INSERT INTO page_document_versions
                        (page_id, version, status, document_json, reason, created_by, created_at)
                    VALUES (%s, %s, 'draft', %s, %s, %s, NOW())
                    """,
                    (page_id, saved_version, Json(document_json), reason, actor_id),
                )
                cur.execute(
                    """
                    UPDATE page_documents_current
                    SET draft_version = %s,
                        updated_by = %s,
                        updated_at = NOW()
                    WHERE page_id = %s
                    """,
                    (saved_version, actor_id, page_id),
                )

            conn.commit()
            return {
                "conflict": False,
                "saved_version": saved_version,
            }


def publish_page_document(
    page_id: str,
    actor_id: str,
    reason: str,
    draft_version: Optional[int] = None,
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            ensure_page_documents_tables(cur)
            cur.execute(
                """
                SELECT page_id, draft_version, published_version
                FROM page_documents_current
                WHERE page_id = %s
                FOR UPDATE
                """,
                (page_id,),
            )
            current = cur.fetchone()
            if not current:
                conn.rollback()
                return None

            selected_draft_version = (
                int(draft_version)
                if draft_version is not None
                else int(current["draft_version"])
            )
            if selected_draft_version <= 0:
                conn.rollback()
                return None

            cur.execute(
                """
                SELECT document_json
                FROM page_document_versions
                WHERE page_id = %s AND version = %s
                """,
                (page_id, selected_draft_version),
            )
            source = cur.fetchone()
            if not source:
                conn.rollback()
                return None

            published_version = int(current["draft_version"]) + 1
            cur.execute(
                """
                INSERT INTO page_document_versions
                    (page_id, version, status, document_json, reason, created_by, created_at)
                VALUES (%s, %s, 'published', %s, %s, %s, NOW())
                """,
                (
                    page_id,
                    published_version,
                    source["document_json"],
                    reason,
                    actor_id,
                ),
            )
            cur.execute(
                """
                UPDATE page_documents_current
                SET draft_version = %s,
                    published_version = %s,
                    updated_by = %s,
                    updated_at = NOW()
                WHERE page_id = %s
                """,
                (published_version, published_version, actor_id, page_id),
            )
            conn.commit()
            return {
                "source_version": selected_draft_version,
                "published_version": published_version,
            }


def list_page_document_versions(page_id: str, limit: int = 50):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            ensure_page_documents_tables(cur)
            cur.execute(
                """
                SELECT page_id, version, status, reason, created_by, created_at
                FROM page_document_versions
                WHERE page_id = %s
                ORDER BY version DESC
                LIMIT %s
                """,
                (page_id, limit),
            )
            return cur.fetchall()


def get_page_document_version(page_id: str, version: int):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            ensure_page_documents_tables(cur)
            cur.execute(
                """
                SELECT page_id, version, status, reason, created_by, created_at, document_json
                FROM page_document_versions
                WHERE page_id = %s AND version = %s
                """,
                (page_id, version),
            )
            return cur.fetchone()


def rollback_page_document(
    page_id: str,
    target_version: int,
    actor_id: str,
    reason: str,
    publish_now: bool = False,
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            ensure_page_documents_tables(cur)
            cur.execute(
                """
                SELECT page_id, draft_version, published_version
                FROM page_documents_current
                WHERE page_id = %s
                FOR UPDATE
                """,
                (page_id,),
            )
            current = cur.fetchone()
            if not current:
                conn.rollback()
                return None

            cur.execute(
                """
                SELECT document_json
                FROM page_document_versions
                WHERE page_id = %s AND version = %s
                """,
                (page_id, target_version),
            )
            source = cur.fetchone()
            if not source:
                conn.rollback()
                return None

            next_version = int(current["draft_version"]) + 1
            cur.execute(
                """
                INSERT INTO page_document_versions
                    (page_id, version, status, document_json, reason, created_by, created_at)
                VALUES (%s, %s, 'draft', %s, %s, %s, NOW())
                """,
                (
                    page_id,
                    next_version,
                    source["document_json"],
                    reason,
                    actor_id,
                ),
            )
            final_published_version = int(current["published_version"])

            if publish_now:
                publish_version = next_version + 1
                cur.execute(
                    """
                    INSERT INTO page_document_versions
                        (page_id, version, status, document_json, reason, created_by, created_at)
                    VALUES (%s, %s, 'published', %s, %s, %s, NOW())
                    """,
                    (
                        page_id,
                        publish_version,
                        source["document_json"],
                        reason,
                        actor_id,
                    ),
                )
                next_version = publish_version
                final_published_version = publish_version

            cur.execute(
                """
                UPDATE page_documents_current
                SET draft_version = %s,
                    published_version = %s,
                    updated_by = %s,
                    updated_at = NOW()
                WHERE page_id = %s
                """,
                (next_version, final_published_version, actor_id, page_id),
            )
            conn.commit()
            return {
                "restored_draft_version": next_version,
                "published_version": final_published_version if publish_now else None,
            }


def create_user(email: str, nickname: str, password_hash: str, status: str = "pending"):
    """사용자 생성 (회원가입)"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO users (email, nickname, password_hash, status)
                VALUES (%s, %s, %s, %s)
                RETURNING id, email, nickname, role, status, provider, provider_user_id, email_verified, avatar_url, bio, token_version, created_at
            """,
                (email, nickname, password_hash, status),
            )
            conn.commit()
            return cur.fetchone()


def get_user_by_email(email: str):
    """이메일로 사용자 조회"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, email, nickname, password_hash, role, status, provider, provider_user_id, email_verified, avatar_url, bio, token_version, created_at
                FROM users WHERE email = %s
            """,
                (email,),
            )
            return cur.fetchone()


def get_user_by_provider(provider: str, provider_user_id: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, email, nickname, password_hash, role, status, provider, provider_user_id, email_verified, avatar_url, bio, token_version, created_at
                FROM users
                WHERE provider = %s AND provider_user_id = %s
                """,
                (provider, provider_user_id),
            )
            return cur.fetchone()


def create_or_update_google_user(
    email: str,
    nickname: str,
    provider_user_id: str,
    email_verified: bool,
):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, email, nickname, role, status, provider, provider_user_id, email_verified, avatar_url, bio, token_version, created_at
                FROM users
                WHERE provider = 'google' AND provider_user_id = %s
                """,
                (provider_user_id,),
            )
            provider_user = cur.fetchone()
            if provider_user:
                cur.execute(
                    """
                    UPDATE users
                    SET email = %s,
                        email_verified = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING id, email, nickname, role, status, provider, provider_user_id, email_verified, avatar_url, bio, token_version, created_at
                    """,
                    (email, email_verified, provider_user["id"]),
                )
                conn.commit()
                return cur.fetchone()

            cur.execute(
                """
                SELECT id, email, nickname, role, status, provider, provider_user_id, email_verified, avatar_url, bio, token_version, created_at
                FROM users
                WHERE email = %s
                """,
                (email,),
            )
            email_user = cur.fetchone()
            if email_user:
                cur.execute(
                    """
                    UPDATE users
                    SET provider = 'google',
                        provider_user_id = %s,
                        email_verified = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING id, email, nickname, role, status, provider, provider_user_id, email_verified, avatar_url, bio, token_version, created_at
                    """,
                    (provider_user_id, email_verified, email_user["id"]),
                )
                conn.commit()
                return cur.fetchone()

            cur.execute(
                """
                INSERT INTO users (
                    email,
                    nickname,
                    role,
                    status,
                    provider,
                    provider_user_id,
                    email_verified
                )
                VALUES (%s, %s, 'user', 'pending', 'google', %s, %s)
                RETURNING id, email, nickname, role, status, provider, provider_user_id, email_verified, avatar_url, bio, token_version, created_at
                """,
                (email, nickname, provider_user_id, email_verified),
            )
            conn.commit()
            return cur.fetchone()


def get_user_by_nickname(nickname: str):
    """닉네임으로 사용자 조회"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, email, nickname, role, status, provider, provider_user_id, email_verified, avatar_url, bio, token_version, created_at
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
                SELECT id, email, nickname, role, status, provider, provider_user_id, email_verified, avatar_url, bio, token_version, created_at
                FROM users WHERE id = %s
            """,
                (user_id,),
            )
            return cur.fetchone()


def bootstrap_super_admin_user(email: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET role = 'super_admin',
                    status = 'active',
                    updated_at = NOW()
                WHERE lower(email) = lower(%s)
                RETURNING id, email, nickname, role, status, provider, provider_user_id, email_verified, avatar_url, bio, token_version, created_at
                """,
                (email,),
            )
            conn.commit()
            return cur.fetchone()


def update_user_profile(user_id: str, updates: dict[str, object]):
    allowed_fields = ["nickname", "bio", "avatar_url"]
    fields_to_update = []
    params = []

    for field in allowed_fields:
        if field in updates:
            fields_to_update.append(f"{field} = %s")
            params.append(updates[field])

    if not fields_to_update:
        return None

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = f"""
                UPDATE users
                SET {", ".join(fields_to_update)}, updated_at = NOW()
                WHERE id = %s
                RETURNING id, email, nickname, role, status, provider, provider_user_id, email_verified, avatar_url, bio, token_version, created_at
            """
            params.append(user_id)
            cur.execute(query, params)
            conn.commit()
            return cur.fetchone()
