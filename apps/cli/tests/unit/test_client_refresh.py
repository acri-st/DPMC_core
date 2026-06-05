"""Tests for ApiClient — bearer attach, auto-refresh near expiry, 401-retry-once."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
import respx
from httpx import Response

from dpmc_cli.api.client import ApiClient
from dpmc_cli.auth.token_store import StoredCredentials, TokenStore
from dpmc_cli.config import CliConfig
from dpmc_cli.errors import CliError


def _creds(*, access_in: int = 300, refresh_in: int = 1800) -> StoredCredentials:
    now = datetime.now(UTC)
    return StoredCredentials(
        issuer="http://kc/realms/dpmc",
        client_id="dpmc-api",
        access_token="AT",
        refresh_token="RT",
        access_token_expires_at=now + timedelta(seconds=access_in),
        refresh_token_expires_at=now + timedelta(seconds=refresh_in),
    )


@pytest.fixture
def cfg(monkeypatch: pytest.MonkeyPatch, tmp_path) -> CliConfig:
    monkeypatch.setenv("DPMC_API_URL", "http://api")
    monkeypatch.setenv("DPMC_KEYCLOAK_URL", "http://kc")
    monkeypatch.setenv("DPMC_CONFIG_DIR", str(tmp_path / "dpmc"))
    return CliConfig()


@respx.mock
def test_get_attaches_bearer_header(cfg: CliConfig) -> None:
    store = TokenStore(cfg)
    store.save(_creds())
    route = respx.get("http://api/auth/me").mock(
        return_value=Response(200, json={"data": {"email": "a@b"}})
    )
    body = ApiClient(cfg, store).get("/auth/me")
    assert body["data"]["email"] == "a@b"
    sent = route.calls[0].request
    assert sent.headers["authorization"] == "Bearer AT"


@respx.mock
def test_refreshes_when_near_expiry(cfg: CliConfig) -> None:
    store = TokenStore(cfg)
    store.save(_creds(access_in=10))  # < 30s threshold

    respx.post("http://kc/realms/dpmc/protocol/openid-connect/token").mock(
        return_value=Response(
            200,
            json={
                "access_token": "NEW_AT",
                "refresh_token": "NEW_RT",
                "expires_in": 300,
                "refresh_expires_in": 1800,
            },
        )
    )
    route = respx.get("http://api/auth/me").mock(
        return_value=Response(200, json={"data": {"email": "a@b"}})
    )

    ApiClient(cfg, store).get("/auth/me")
    sent = route.calls[0].request
    assert sent.headers["authorization"] == "Bearer NEW_AT"
    persisted = store.load()
    assert persisted is not None
    assert persisted.access_token == "NEW_AT"


@respx.mock
def test_retries_once_on_401_then_succeeds(cfg: CliConfig) -> None:
    store = TokenStore(cfg)
    store.save(_creds())

    refresh = respx.post("http://kc/realms/dpmc/protocol/openid-connect/token").mock(
        return_value=Response(
            200,
            json={
                "access_token": "NEW_AT",
                "refresh_token": "NEW_RT",
                "expires_in": 300,
                "refresh_expires_in": 1800,
            },
        )
    )
    api = respx.get("http://api/auth/me")
    api.side_effect = [
        Response(401),
        Response(200, json={"data": {"email": "a@b"}}),
    ]

    body = ApiClient(cfg, store).get("/auth/me")
    assert body["data"]["email"] == "a@b"
    assert refresh.called
    assert len(api.calls) == 2


@respx.mock
def test_raises_clierror_when_refresh_fails_on_401(cfg: CliConfig) -> None:
    store = TokenStore(cfg)
    store.save(_creds())
    respx.post("http://kc/realms/dpmc/protocol/openid-connect/token").mock(
        return_value=Response(400, json={"error": "invalid_grant"})
    )
    respx.get("http://api/auth/me").mock(return_value=Response(401))

    with pytest.raises(CliError) as ei:
        ApiClient(cfg, store).get("/auth/me")
    assert ei.value.exit_code == 2
    assert "session expired" in str(ei.value)


@respx.mock
def test_raises_clierror_when_api_unreachable(cfg: CliConfig) -> None:
    store = TokenStore(cfg)
    store.save(_creds())
    import httpx

    respx.get("http://api/auth/me").mock(side_effect=httpx.ConnectError("nope"))

    with pytest.raises(CliError) as ei:
        ApiClient(cfg, store).get("/auth/me")
    assert ei.value.exit_code == 2
    assert "cannot reach API" in str(ei.value)


def test_raises_clierror_when_not_logged_in(cfg: CliConfig) -> None:
    store = TokenStore(cfg)
    with pytest.raises(CliError) as ei:
        ApiClient(cfg, store).get("/auth/me")
    assert ei.value.exit_code == 2
    assert "not logged in" in str(ei.value)
