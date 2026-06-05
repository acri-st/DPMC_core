"""HTTP client wrapper that attaches Bearer, auto-refreshes, and retries on 401."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, cast

import httpx
from pydantic import BaseModel

from dpmc_cli.auth.token_store import StoredCredentials, TokenStore
from dpmc_cli.config import CliConfig
from dpmc_cli.errors import CliError

REFRESH_LEEWAY_S = 30


class _TokenRefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    refresh_expires_in: int


class ApiClient:
    """Synchronous httpx client targeting the NestJS API at `cfg.api_url`."""

    def __init__(
        self,
        config: CliConfig,
        store: TokenStore,
        http: httpx.Client | None = None,
    ) -> None:
        self._config = config
        self._store = store
        self._http = http or httpx.Client(timeout=10.0)

    # -- public API --

    def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        return self._request("GET", path, params=params)

    def post(self, path: str, json: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", path, json=json)

    def delete(self, path: str) -> dict[str, Any]:
        return self._request("DELETE", path)

    # -- internals --

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        creds = self._store.load()
        if creds is None:
            raise CliError(2, "not logged in, run 'dpmc login'")

        creds = self._ensure_fresh(creds)
        url = self._url(path)

        try:
            resp = self._send(method, url, creds.access_token, params=params, json=json)
        except httpx.ConnectError as exc:
            raise CliError(2, f"cannot reach API at {self._config.api_url}") from exc

        if resp.status_code == 401:
            refreshed = self._refresh(creds)
            try:
                resp = self._send(method, url, refreshed.access_token, params=params, json=json)
            except httpx.ConnectError as exc:
                raise CliError(2, f"cannot reach API at {self._config.api_url}") from exc
            if resp.status_code == 401:
                raise CliError(2, "authentication failed")

        return self._handle_response(resp)

    def _send(
        self,
        method: str,
        url: str,
        access_token: str,
        *,
        params: dict[str, Any] | None,
        json: dict[str, Any] | None,
    ) -> httpx.Response:
        headers = {"Authorization": f"Bearer {access_token}"}
        return self._http.request(method, url, headers=headers, params=params, json=json)

    def _url(self, path: str) -> str:
        base = self._config.api_url.rstrip("/")
        return f"{base}/{path.lstrip('/')}"

    def _ensure_fresh(self, creds: StoredCredentials) -> StoredCredentials:
        now = datetime.now(UTC)
        if creds.access_token_expires_at - now > timedelta(seconds=REFRESH_LEEWAY_S):
            return creds
        return self._refresh(creds)

    def _refresh(self, creds: StoredCredentials) -> StoredCredentials:
        try:
            resp = self._http.post(
                self._config.token_endpoint,
                data={
                    "grant_type": "refresh_token",
                    "client_id": self._config.client_id,
                    "refresh_token": creds.refresh_token,
                },
            )
        except httpx.ConnectError as exc:
            raise CliError(2, "cannot reach Keycloak") from exc

        if resp.status_code != 200:
            raise CliError(2, "session expired, run 'dpmc login'")

        body = _TokenRefreshResponse.model_validate(resp.json())
        now = datetime.now(UTC)
        new = StoredCredentials(
            issuer=creds.issuer,
            client_id=creds.client_id,
            access_token=body.access_token,
            refresh_token=body.refresh_token,
            access_token_expires_at=now + timedelta(seconds=body.expires_in),
            refresh_token_expires_at=now + timedelta(seconds=body.refresh_expires_in),
        )
        self._store.save(new)
        return new

    def _handle_response(self, resp: httpx.Response) -> dict[str, Any]:
        if 200 <= resp.status_code < 300:
            if resp.status_code == 204 or not resp.content:
                return {}
            try:
                return cast(dict[str, Any], resp.json())
            except ValueError as exc:
                raise CliError(3, f"API error: {resp.status_code} (invalid JSON)") from exc

        # Error path — map known codes
        if resp.status_code == 403:
            raise CliError(1, "forbidden (requires role: operator)")
        if resp.status_code == 404:
            raise CliError(1, "not found")
        if resp.status_code == 409:
            raise CliError(1, self._extract_error_message(resp))
        if 400 <= resp.status_code < 500:
            raise CliError(1, self._extract_error_message(resp))
        raise CliError(3, f"API error: {resp.status_code} {resp.text[:200]}")

    def _extract_error_message(self, resp: httpx.Response) -> str:
        try:
            body = resp.json()
        except ValueError:
            return resp.text[:200]
        if isinstance(body, dict):
            for key in ("message", "error", "detail"):
                v = body.get(key)
                if isinstance(v, str):
                    return v
        return f"{resp.status_code}"
