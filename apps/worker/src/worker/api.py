"""Tiny synchronous HTTP client for the DPMC API."""

from __future__ import annotations

import json as _json
from typing import Any

import httpx


class ApiError(Exception):
    """Raised on any non-2xx response or transport-level failure.

    ``status_code`` is ``0`` when the failure happened before we got a response
    (DNS, TCP, TLS, timeout).
    """

    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code


class WorkerApi:
    """Wraps the three host endpoints the worker needs."""

    HEADER_NAME = "X-Worker-Token"

    def __init__(self, base_url: str, token: str, *, timeout: float = 10.0) -> None:
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=timeout,
            headers={self.HEADER_NAME: token},
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> WorkerApi:
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()

    def register(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._post("/host/register", payload)

    def heartbeat(self, host_id: int) -> dict[str, Any]:
        return self._post(f"/host/{host_id}/heartbeat")

    def update_status(self, host_id: int, status: str) -> dict[str, Any]:
        return self._patch(f"/host/{host_id}/status", {"status": status})

    def ingest_logs(
        self, host_id: int, logs: list[dict[str, Any]]
    ) -> dict[str, Any]:
        return self._post(f"/host/{host_id}/logs", {"logs": logs})

    def next_job(self, host_id: int) -> dict[str, Any] | None:
        return self._send_optional("GET", f"/worker/{host_id}/next-job", None)

    def report_result(
        self, host_id: int, job_id: int, body: dict[str, Any]
    ) -> dict[str, Any]:
        return self._post(f"/worker/{host_id}/jobs/{job_id}/result", body)

    def report_outputs(
        self, host_id: int, job_id: int, outputs: list[dict[str, Any]]
    ) -> dict[str, Any]:
        return self._post(
            f"/worker/{host_id}/jobs/{job_id}/outputs", {"outputs": outputs}
        )

    def _post(
        self, path: str, body: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        return self._send("POST", path, body)

    def _patch(
        self, path: str, body: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        return self._send("PATCH", path, body)

    def _send(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None,
    ) -> dict[str, Any]:
        content = _json.dumps(body or {}, separators=(",", ":"))
        try:
            resp = self._client.request(
                method,
                path,
                content=content,
                headers={"Content-Type": "application/json"},
            )
        except httpx.HTTPError as exc:
            raise ApiError(0, f"Network error on {method} {path}: {exc}") from exc

        if resp.status_code >= 400:
            raise ApiError(
                resp.status_code,
                f"{method} {path} returned {resp.status_code}: {resp.text}",
            )

        try:
            envelope = resp.json()
        except ValueError as exc:
            raise ApiError(
                resp.status_code, f"{method} {path}: invalid JSON response"
            ) from exc

        data = envelope.get("data") if isinstance(envelope, dict) else None
        return data if isinstance(data, dict) else {}

    def _send_optional(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None,
    ) -> dict[str, Any] | None:
        content = _json.dumps(body or {}, separators=(",", ":"))
        try:
            resp = self._client.request(
                method,
                path,
                content=content,
                headers={"Content-Type": "application/json"},
            )
        except httpx.HTTPError as exc:
            raise ApiError(0, f"Network error on {method} {path}: {exc}") from exc

        if resp.status_code >= 400:
            raise ApiError(
                resp.status_code,
                f"{method} {path} returned {resp.status_code}: {resp.text}",
            )

        try:
            envelope = resp.json()
        except ValueError as exc:
            raise ApiError(
                resp.status_code, f"{method} {path}: invalid JSON response"
            ) from exc

        data = envelope.get("data") if isinstance(envelope, dict) else None
        if data is None:
            return None
        return data if isinstance(data, dict) else {}
