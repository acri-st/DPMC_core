"""Tests for `dpmc login` / `dpmc logout` / `dpmc whoami`."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
import respx
from httpx import Response
from typer.testing import CliRunner

from dpmc_cli.auth.token_store import StoredCredentials, TokenStore
from dpmc_cli.config import CliConfig
from dpmc_cli.main import app

runner = CliRunner()


def _fresh_creds() -> StoredCredentials:
    now = datetime.now(UTC)
    return StoredCredentials(
        issuer="http://kc/realms/dpmc",
        client_id="dpmc-api",
        access_token="AT",
        refresh_token="RT",
        access_token_expires_at=now + timedelta(seconds=300),
        refresh_token_expires_at=now + timedelta(seconds=1800),
    )


@respx.mock
def test_login_happy_path(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("DPMC_KEYCLOAK_URL", "http://kc")
    monkeypatch.setenv("DPMC_CONFIG_DIR", str(tmp_path / "dpmc"))

    respx.post("http://kc/realms/dpmc/protocol/openid-connect/auth/device").mock(
        return_value=Response(
            200,
            json={
                "device_code": "D",
                "user_code": "ABCD-EFGH",
                "verification_uri": "http://kc/realms/dpmc/device",
                "verification_uri_complete": "http://kc/realms/dpmc/device?user_code=ABCD-EFGH",
                "interval": 0,
                "expires_in": 600,
            },
        )
    )
    respx.post("http://kc/realms/dpmc/protocol/openid-connect/token").mock(
        return_value=Response(
            200,
            json={
                "access_token": "AT",
                "refresh_token": "RT",
                "expires_in": 300,
                "refresh_expires_in": 1800,
            },
        )
    )

    result = runner.invoke(app, ["login"])
    assert result.exit_code == 0, result.stderr
    assert "ABCD-EFGH" in result.stdout
    cfg = CliConfig()
    assert TokenStore(cfg).load() is not None


def test_logout_clears_file_even_when_revoke_fails(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    monkeypatch.setenv("DPMC_KEYCLOAK_URL", "http://kc")
    monkeypatch.setenv("DPMC_CONFIG_DIR", str(tmp_path / "dpmc"))
    cfg = CliConfig()
    TokenStore(cfg).save(_fresh_creds())

    with respx.mock(assert_all_called=False):
        respx.post("http://kc/realms/dpmc/protocol/openid-connect/logout").mock(
            return_value=Response(500)
        )
        result = runner.invoke(app, ["logout"])

    assert result.exit_code == 0
    assert TokenStore(cfg).load() is None


def test_logout_when_not_logged_in_is_idempotent(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    monkeypatch.setenv("DPMC_CONFIG_DIR", str(tmp_path / "dpmc"))
    result = runner.invoke(app, ["logout"])
    assert result.exit_code == 0


@respx.mock
def test_whoami_prints_profile(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("DPMC_KEYCLOAK_URL", "http://kc")
    monkeypatch.setenv("DPMC_API_URL", "http://api")
    monkeypatch.setenv("DPMC_CONFIG_DIR", str(tmp_path / "dpmc"))
    cfg = CliConfig()
    TokenStore(cfg).save(_fresh_creds())

    respx.get("http://api/auth/me").mock(
        return_value=Response(
            200,
            json={
                "data": {
                    "id": "u-1",
                    "email": "a@b",
                    "displayName": "Alice",
                    "avatarUrl": None,
                    "roles": ["operator"],
                }
            },
        )
    )

    result = runner.invoke(app, ["whoami"])
    assert result.exit_code == 0, result.stderr
    assert "a@b" in result.stdout
    assert "operator" in result.stdout


def test_whoami_when_not_logged_in(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("DPMC_CONFIG_DIR", str(tmp_path / "dpmc"))
    result = runner.invoke(app, ["whoami"])
    assert result.exit_code == 2
    assert "not logged in" in result.stderr
