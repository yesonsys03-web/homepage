"""XP / 바이브 레벨 API 라우트"""

from __future__ import annotations

from types import ModuleType

from fastapi import Depends, FastAPI, HTTPException


def register_xp_routes(app: FastAPI, main_module: ModuleType) -> None:
    get_current_user = main_module.get_current_user
    get_db_connection = main_module.get_db_connection

    @app.get("/api/xp/me")
    async def get_my_xp(current_user: dict = Depends(get_current_user)):
        """내 XP/레벨/뱃지 조회"""
        user_id = str(current_user.get("id", ""))
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                from xp_service import get_user_badges, get_xp_summary
                summary = get_xp_summary(cur, user_id)
                badges = get_user_badges(cur, user_id)
        return {**summary, "badges": badges}

    @app.post("/api/xp/award")
    async def award_xp_endpoint(
        payload: dict,
        current_user: dict = Depends(get_current_user),
    ):
        """XP 지급 (인증된 사용자)"""
        event_type = str(payload.get("event_type", "")).strip()
        ref_id = str(payload.get("ref_id", "")).strip() or None

        if not event_type:
            raise HTTPException(status_code=400, detail="event_type이 필요합니다")

        from xp_service import XP_EVENT_MAP
        if event_type not in XP_EVENT_MAP:
            raise HTTPException(status_code=400, detail=f"알 수 없는 이벤트 유형: {event_type}")

        user_id = str(current_user.get("id", ""))
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                from xp_service import award_xp
                result = award_xp(cur, user_id, event_type, ref_id)
            conn.commit()
        return result
