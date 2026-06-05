"""Debounced async heartbeat that POSTs to /scheduler/heartbeat at most once per second."""

from __future__ import annotations

import asyncio
import logging
import time

import httpx

log = logging.getLogger("dispatcher.heartbeat")


class SchedulerHeartbeat:
    def __init__(self, api_url: str, api_token: str, *, min_interval_s: float = 1.0) -> None:
        self._api_url = api_url.rstrip("/")
        self._api_token = api_token
        self._min_interval_s = min_interval_s
        self._last_sent = 0.0
        self._lock = asyncio.Lock()

    async def maybe_send(self, queue_depth: int, running_count: int) -> bool:
        """Send a heartbeat if more than `min_interval_s` has passed since the last."""
        async with self._lock:
            now = time.monotonic()
            if now - self._last_sent < self._min_interval_s:
                return False
            self._last_sent = now

        try:
            async with httpx.AsyncClient(base_url=self._api_url, timeout=5.0) as client:
                resp = await client.post(
                    "/scheduler/heartbeat",
                    json={"queueDepth": queue_depth, "runningCount": running_count},
                    headers={"X-Worker-Token": self._api_token} if self._api_token else {},
                )
                resp.raise_for_status()
                return True
        except httpx.HTTPError as exc:
            log.warning("scheduler heartbeat failed: %s", exc)
            return False
