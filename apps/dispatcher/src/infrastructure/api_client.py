"""Calls the API to expand a Task into Batches and Jobs."""

from __future__ import annotations

import asyncio
import logging

import httpx

log = logging.getLogger("dispatcher.api_client")


class ChainExpansionUnavailable(NotImplementedError):
    """Raised when the API endpoint for expanding a chain is not yet wired."""


async def expand_task_via_api(api_url: str, api_token: str, task_id: int) -> None:
    """POST /scheduler/task/:id/expand. Raises on non-2xx."""
    headers = {"X-Worker-Token": api_token} if api_token else {}
    async with httpx.AsyncClient(base_url=api_url.rstrip("/"), timeout=60.0) as client:
        resp = await client.post(f"/scheduler/task/{task_id}/expand", headers=headers)
        resp.raise_for_status()


async def wait_for_api_ready(api_url: str, *, poll_interval_s: float = 2.0) -> None:
    """Poll GET /status until it returns a 2xx. Blocks until the API is reachable."""
    base = api_url.rstrip("/")
    attempt = 0
    while True:
        attempt += 1
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(f"{base}/status")
                if resp.is_success:
                    log.info("api ready at %s (after %d attempt(s))", base, attempt)
                    return
                log.info("api status %d at %s, retrying in %.1fs", resp.status_code, base, poll_interval_s)
        except httpx.HTTPError as exc:
            if attempt == 1:
                log.info("waiting for api at %s (%s)", base, exc)
        await asyncio.sleep(poll_interval_s)
