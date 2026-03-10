from __future__ import annotations

import threading
import time
from collections import deque
from types import ModuleType
from typing import Optional

from fastapi import FastAPI, HTTPException, Request

# 익명 박수 중복 방지: IP + project_id 단위로 24h 슬라이딩 윈도우
_CLAP_LOCK = threading.Lock()
_CLAP_BUCKETS: dict[str, deque[float]] = {}

CLAP_WINDOW_SECONDS: float = 86400.0  # 24h
CLAP_LIMIT_PER_WINDOW: int = 1


def _check_anon_clap_allowed(ip: str, project_id: str) -> bool:
    """True=허용, False=이미 박수를 쳤음(24h 이내)."""
    now = time.monotonic()
    bucket_key = f"clap:{ip}:{project_id}"
    with _CLAP_LOCK:
        samples = _CLAP_BUCKETS.setdefault(bucket_key, deque())
        while samples and now - samples[0] >= CLAP_WINDOW_SECONDS:
            samples.popleft()
        if len(samples) >= CLAP_LIMIT_PER_WINDOW:
            return False
        samples.append(now)
        return True


def register_showcase_clap_routes(app: FastAPI, main_module: ModuleType) -> None:
    @app.post("/api/showcase/{project_id}/clap")
    def clap_showcase_project(project_id: str, request: Request):
        # 선택적 인증: 로그인 사용자면 user_id 추출
        user_id: Optional[str] = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            if token:
                try:
                    decoded = main_module.decode_token(token)
                    sub = decoded.get("sub") if decoded else None
                    if isinstance(sub, str) and sub:
                        user_id = sub
                except Exception:
                    pass

        if user_id:
            # 인증 사용자: project_likes ON CONFLICT로 DB 레벨 중복 방지
            like_count = main_module.like_project(project_id, user_id)
            main_module._invalidate_projects_cache()
            return {"like_count": like_count, "clapped": True}

        # 익명 사용자: IP 기반 24h 중복 방지
        ip = main_module._extract_client_ip(request)
        if not _check_anon_clap_allowed(ip, project_id):
            raise HTTPException(
                status_code=429,
                detail="이미 박수를 쳤습니다. 내일 다시 응원해 주세요.",
            )

        like_count = main_module.anon_clap_project(project_id)
        if like_count == 0:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
        main_module._invalidate_projects_cache()
        return {"like_count": like_count, "clapped": True}
