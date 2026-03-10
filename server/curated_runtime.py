from __future__ import annotations

import asyncio
from typing import Optional

_last_curated_related_click_fallback_warning_at = 0.0
_curated_collection_task: Optional[asyncio.Task[None]] = None
_stars_refresh_task: Optional[asyncio.Task[None]] = None


def get_last_curated_related_click_fallback_warning_at() -> float:
    return _last_curated_related_click_fallback_warning_at


def set_last_curated_related_click_fallback_warning_at(value: float) -> None:
    global _last_curated_related_click_fallback_warning_at
    _last_curated_related_click_fallback_warning_at = value


def get_curated_collection_task() -> Optional[asyncio.Task[None]]:
    return _curated_collection_task


def set_curated_collection_task(task: Optional[asyncio.Task[None]]) -> None:
    global _curated_collection_task
    _curated_collection_task = task


def get_stars_refresh_task() -> Optional[asyncio.Task[None]]:
    return _stars_refresh_task


def set_stars_refresh_task(task: Optional[asyncio.Task[None]]) -> None:
    global _stars_refresh_task
    _stars_refresh_task = task
