from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

# 6개월 이상 미업데이트 레포를 "유지보수 중단"으로 판정
MAINTENANCE_STOPPED_DAYS = 180


def fetch_repo_info(owner: str, repo_name: str, github_token: str) -> dict[str, object] | None:
    """GitHub API로 레포의 현재 스타 수와 마지막 push 시각을 조회."""
    url = f"https://api.github.com/repos/{quote(owner)}/{quote(repo_name)}"
    headers: dict[str, str] = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "vibecoder-playground-stars-refresher",
    }
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    try:
        with urlopen(Request(url, headers=headers), timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except HTTPError as exc:
        logger.warning("stars refresh HTTP error %s for %s/%s", exc.code, owner, repo_name)
        return None
    except (URLError, Exception) as exc:
        logger.warning("stars refresh failed for %s/%s: %s", owner, repo_name, exc)
        return None

    if not isinstance(payload, dict):
        return None

    stars = payload.get("stargazers_count")
    pushed_at = payload.get("pushed_at")
    return {
        "stars": int(stars) if isinstance(stars, (int, float)) else 0,
        "github_pushed_at": str(pushed_at).replace("Z", "+00:00") if isinstance(pushed_at, str) else "",
    }


def is_maintenance_stopped(github_pushed_at: str, now: datetime | None = None) -> bool:
    """마지막 push가 MAINTENANCE_STOPPED_DAYS일 이상 지났으면 True."""
    if not github_pushed_at:
        return False
    try:
        pushed_dt = datetime.fromisoformat(github_pushed_at).astimezone(UTC)
    except ValueError:
        return False
    current = now or datetime.now(UTC)
    return pushed_dt < (current - timedelta(days=MAINTENANCE_STOPPED_DAYS))


def refresh_stars_for_approved_content(github_token: str) -> dict[str, object]:
    """
    approved 상태 큐레이션 카드의 스타 수를 GitHub에서 최신화하고,
    6개월 이상 미업데이트 레포에 is_maintenance_stopped=True를 표시한다.
    """
    from db import bulk_update_curated_stars, list_approved_curated_for_stars_refresh

    rows = list_approved_curated_for_stars_refresh()
    if not rows:
        return {"updated": 0, "skipped": 0, "maintenance_stopped": 0, "message": "no approved content"}

    now = datetime.now(UTC)
    updates: list[dict[str, object]] = []
    skipped = 0

    for row in rows:
        owner = str(row.get("repo_owner") or "").strip()
        repo_name = str(row.get("repo_name") or "").strip()
        if not owner or not repo_name:
            skipped += 1
            continue

        info = fetch_repo_info(owner, repo_name, github_token)
        if info is None:
            skipped += 1
            continue

        pushed_at_str = str(info.get("github_pushed_at") or "")
        updates.append({
            "id": row["id"],
            "stars": info["stars"],
            "github_pushed_at": pushed_at_str or None,
            "is_maintenance_stopped": is_maintenance_stopped(pushed_at_str, now),
        })

    maintenance_stopped_count = sum(1 for u in updates if u["is_maintenance_stopped"])
    if updates:
        bulk_update_curated_stars(updates)

    logger.info(
        "[stars-refresh] updated=%d skipped=%d maintenance_stopped=%d",
        len(updates), skipped, maintenance_stopped_count,
    )
    return {
        "updated": len(updates),
        "skipped": skipped,
        "maintenance_stopped": maintenance_stopped_count,
    }
