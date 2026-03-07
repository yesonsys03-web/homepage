from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from contextlib import suppress


AsyncJob = Callable[[], Awaitable[None]]


async def run_periodic_async_loop(
    *,
    interval_seconds: int,
    callback: AsyncJob,
    run_immediately: bool = False,
) -> None:
    if interval_seconds <= 0:
        raise ValueError("interval_seconds must be positive")

    if run_immediately:
        await callback()

    while True:
        await asyncio.sleep(interval_seconds)
        await callback()


async def cancel_background_task(task: asyncio.Task[None] | None) -> None:
    if task is None:
        return

    _ = task.cancel()
    with suppress(asyncio.CancelledError):
        await task
