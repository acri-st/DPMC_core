"""OAuth 2.0 Device Authorization Grant (RFC 8628) against Keycloak.

PKCE (RFC 7636) is layered on top because the `dpmc-api` Keycloak client
enforces `pkce.code.challenge.method=S256` for all flows.
"""

from __future__ import annotations

import base64
import hashlib
import secrets
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import httpx
from pydantic import BaseModel

from dpmc_cli.auth.token_store import StoredCredentials
from dpmc_cli.config import CliConfig

DEVICE_CODE_GRANT = "urn:ietf:params:oauth:grant-type:device_code"


def _generate_pkce_pair() -> tuple[str, str]:
    """Return (code_verifier, code_challenge) for PKCE S256."""
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(64)).rstrip(b"=").decode("ascii")
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest())
        .rstrip(b"=")
        .decode("ascii")
    )
    return verifier, challenge


class DeviceFlowError(Exception):
    """Raised when the device flow fails terminally (expired, denied, etc.)."""


class DeviceCodeInfo(BaseModel):
    device_code: str
    user_code: str
    verification_uri: str
    verification_uri_complete: str
    interval: int
    expires_in: int


class _TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    refresh_expires_in: int


class DeviceFlow:
    def __init__(self, config: CliConfig, http: httpx.Client | None = None) -> None:
        self._config = config
        self._http = http or httpx.Client(timeout=10.0)
        self._code_verifier: str | None = None

    def initiate(self) -> DeviceCodeInfo:
        verifier, challenge = _generate_pkce_pair()
        self._code_verifier = verifier
        try:
            resp = self._http.post(
                self._config.device_endpoint,
                data={
                    "client_id": self._config.client_id,
                    "scope": "openid profile email",
                    "code_challenge": challenge,
                    "code_challenge_method": "S256",
                },
            )
        except httpx.ConnectError as exc:
            raise DeviceFlowError(f"cannot reach Keycloak at {self._config.keycloak_url}") from exc
        if resp.status_code != 200:
            raise DeviceFlowError(
                f"device endpoint returned {resp.status_code}: {resp.text}"
            )
        return DeviceCodeInfo.model_validate(resp.json())

    def poll(
        self,
        info: DeviceCodeInfo,
        sleep: Callable[[float], None] = time.sleep,
    ) -> StoredCredentials:
        if self._code_verifier is None:
            raise DeviceFlowError("poll() called before initiate()")
        interval = max(info.interval, 1)
        deadline = time.monotonic() + info.expires_in
        while True:
            if time.monotonic() > deadline:
                raise DeviceFlowError("device code expired before authorization")
            sleep(interval)
            resp = self._http.post(
                self._config.token_endpoint,
                data={
                    "grant_type": DEVICE_CODE_GRANT,
                    "client_id": self._config.client_id,
                    "device_code": info.device_code,
                    "code_verifier": self._code_verifier,
                },
            )
            if resp.status_code == 200:
                tokens = _TokenResponse.model_validate(resp.json())
                now = datetime.now(UTC)
                return StoredCredentials(
                    issuer=self._config.issuer,
                    client_id=self._config.client_id,
                    access_token=tokens.access_token,
                    refresh_token=tokens.refresh_token,
                    access_token_expires_at=now + timedelta(seconds=tokens.expires_in),
                    refresh_token_expires_at=now
                    + timedelta(seconds=tokens.refresh_expires_in),
                )
            body: dict[str, object] = {}
            try:
                body = resp.json()
            except Exception:
                body = {}
            error = body.get("error")
            if error == "authorization_pending":
                continue
            if error == "slow_down":
                interval += 5
                continue
            if error == "expired_token":
                raise DeviceFlowError("device code expired")
            if error == "access_denied":
                raise DeviceFlowError("user denied authorization")
            raise DeviceFlowError(
                f"token endpoint returned {resp.status_code}: {resp.text}"
            )
