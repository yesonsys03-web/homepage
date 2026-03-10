"""Launchpad API routes: tips & error clinic."""

from __future__ import annotations

import os
from types import ModuleType

from fastapi import Depends, FastAPI, HTTPException, Request
from psycopg2.extras import RealDictCursor


def register_launchpad_routes(app: FastAPI, main_module: ModuleType) -> None:
    get_current_user = main_module.get_current_user
    get_db_connection = main_module.get_db_connection
    require_admin = main_module.require_admin

    # ------------------------------------------------------------------
    # Public: list tips
    # ------------------------------------------------------------------

    @app.get("/api/launchpad/tips")
    async def list_launchpad_tips(
        tool_tag: str | None = None,
        topic_tag: str | None = None,
        search: str | None = None,
        sort: str = "date",
        limit: int = 20,
        offset: int = 0,
    ):
        limit = min(limit, 100)
        conditions: list[str] = ["status = 'active'"]
        params: list[object] = []

        if tool_tag:
            params.append(tool_tag)
            conditions.append(f"%s = ANY(tool_tags)")
        if topic_tag:
            params.append(topic_tag)
            conditions.append(f"%s = ANY(topic_tags)")
        if search:
            params.append(f"%{search}%")
            conditions.append("(og_title ILIKE %s OR description_kr ILIKE %s)")
            params.append(f"%{search}%")

        where = "WHERE " + " AND ".join(conditions) if conditions else ""

        order = {
            "date": "created_at DESC",
            "name": "og_title ASC",
            "alpha": "og_title ASC",
        }.get(sort, "created_at DESC")

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"SELECT COUNT(*) FROM launchpad_tips {where}",
                    params,
                )
                total = (cur.fetchone() or {}).get("count", 0)  # type: ignore[union-attr]
                params_paged = list(params) + [limit, offset]
                cur.execute(
                    f"""
                    SELECT id, source_url, platform, author_handle, og_title,
                           og_image_url, description_kr, tool_tags, topic_tags,
                           is_link_valid, created_at
                    FROM launchpad_tips
                    {where}
                    ORDER BY {order}
                    LIMIT %s OFFSET %s
                    """,
                    params_paged,
                )
                items = [dict(r) for r in cur.fetchall()]
        return {"items": items, "total": total}

    # ------------------------------------------------------------------
    # Public: error clinic
    # ------------------------------------------------------------------

    @app.post("/api/launchpad/error-clinic")
    async def launchpad_error_clinic(payload: dict, request: Request):
        error_text = str(payload.get("error_text", "")).strip()[:2000]
        tool = str(payload.get("tool", "claude-code")).strip()
        os_name = str(payload.get("os", "mac")).strip()
        tool_version = str(payload.get("tool_version", "")).strip() or None

        if not error_text:
            raise HTTPException(status_code=400, detail="에러 로그를 입력해주세요")

        api_key = os.getenv("GEMINI_API_KEY", "")
        from launchpad_utils import analyze_error_with_gemini
        result = analyze_error_with_gemini(error_text, tool, os_name, tool_version, api_key)

        client_ip = request.client.host if request.client else None
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO launchpad_error_logs
                      (error_text, tool, os, tool_version, gemini_diagnosis, gemini_solution, client_ip)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        error_text[:500],
                        tool,
                        os_name,
                        tool_version,
                        result.get("diagnosis"),
                        result.get("solution"),
                        client_ip,
                    ),
                )
            conn.commit()
        return result

    # ------------------------------------------------------------------
    # Admin: fetch URL → og + Gemini
    # ------------------------------------------------------------------

    @app.post("/api/admin/launchpad/tips/fetch-url")
    async def admin_fetch_tip_url(
        payload: dict,
        current_user: dict = Depends(get_current_user),
    ):
        require_admin(current_user)
        url = str(payload.get("url", "")).strip()
        if not url:
            raise HTTPException(status_code=400, detail="URL이 필요합니다")

        from launchpad_utils import detect_platform, fetch_og_tags, classify_launchpad_tip
        og = fetch_og_tags(url)
        platform = detect_platform(url)
        og_title = og.get("title") or url
        og_description = og.get("description") or ""
        og_image_url = og.get("image") or None

        api_key = os.getenv("GEMINI_API_KEY", "")
        classified = classify_launchpad_tip(og_title, og_description, api_key)

        # Try to get author handle from og:site_name or URL
        author_handle = og.get("site_name") or ""

        return {
            "platform": platform,
            "author_handle": author_handle,
            "og_title": og_title,
            "og_image_url": og_image_url,
            "description_kr": classified.get("description_kr", og_title),
            "tool_tags": classified.get("tool_tags", []),
            "topic_tags": classified.get("topic_tags", []),
        }

    # ------------------------------------------------------------------
    # Admin: CRUD
    # ------------------------------------------------------------------

    @app.post("/api/admin/launchpad/tips")
    async def admin_create_tip(
        payload: dict,
        current_user: dict = Depends(get_current_user),
    ):
        require_admin(current_user)
        required = ["source_url", "platform", "og_title", "description_kr"]
        for field in required:
            if not payload.get(field):
                raise HTTPException(status_code=400, detail=f"{field}이 필요합니다")

        user_id = str(current_user["id"])
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO launchpad_tips
                      (source_url, platform, author_handle, og_title, og_image_url,
                       description_kr, tool_tags, topic_tags, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        payload["source_url"],
                        payload["platform"],
                        payload.get("author_handle"),
                        payload["og_title"],
                        payload.get("og_image_url"),
                        payload["description_kr"],
                        payload.get("tool_tags", []),
                        payload.get("topic_tags", []),
                        user_id,
                    ),
                )
                row = dict(cur.fetchone())  # type: ignore[arg-type]
            conn.commit()
        return row

    @app.put("/api/admin/launchpad/tips/{tip_id}")
    async def admin_update_tip(
        tip_id: int,
        payload: dict,
        current_user: dict = Depends(get_current_user),
    ):
        require_admin(current_user)
        updatable = [
            "og_title", "og_image_url", "description_kr",
            "tool_tags", "topic_tags", "author_handle", "status",
        ]
        updates = {k: v for k, v in payload.items() if k in updatable}
        if not updates:
            raise HTTPException(status_code=400, detail="수정할 항목이 없습니다")

        set_clause = ", ".join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [tip_id]

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    UPDATE launchpad_tips SET {set_clause}, updated_at = NOW()
                    WHERE id = %s RETURNING *
                    """,
                    values,
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="팁을 찾을 수 없습니다")
                result = dict(row)
            conn.commit()
        return result

    @app.delete("/api/admin/launchpad/tips/{tip_id}")
    async def admin_delete_tip(
        tip_id: int,
        current_user: dict = Depends(get_current_user),
    ):
        require_admin(current_user)
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM launchpad_tips WHERE id = %s", (tip_id,))
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="팁을 찾을 수 없습니다")
            conn.commit()
        return {"ok": True}

    @app.post("/api/admin/launchpad/tips/check-links")
    async def admin_check_links(current_user: dict = Depends(get_current_user)):
        require_admin(current_user)
        from launchpad_utils import check_link_valid
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id, source_url FROM launchpad_tips WHERE status = 'active'")
                tips = [(r["id"], r["source_url"]) for r in cur.fetchall()]

            checked = 0
            invalid = 0
            with conn.cursor() as cur:
                for tip_id, url in tips:
                    valid = check_link_valid(url)
                    cur.execute(
                        "UPDATE launchpad_tips SET is_link_valid = %s, last_link_checked_at = NOW() WHERE id = %s",
                        (valid, tip_id),
                    )
                    checked += 1
                    if not valid:
                        invalid += 1
            conn.commit()
        return {"checked": checked, "invalid": invalid}

    # ------------------------------------------------------------------
    # Admin: list all tips
    # ------------------------------------------------------------------

    @app.get("/api/admin/launchpad/tips")
    async def admin_list_tips(
        status: str | None = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_admin(current_user)
        where = ""
        params: list[object] = []
        if status:
            where = "WHERE status = %s"
            params.append(status)

        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"SELECT * FROM launchpad_tips {where} ORDER BY created_at DESC LIMIT 200",
                    params,
                )
                items = [dict(r) for r in cur.fetchall()]
        return {"items": items, "total": len(items)}
