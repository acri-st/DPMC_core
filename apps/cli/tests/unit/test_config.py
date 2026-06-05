"""Tests for dpmc_cli.config."""

from __future__ import annotations

import pytest

from dpmc_cli.config import CliConfig


def test_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    for var in ("DPMC_API_URL", "DPMC_KEYCLOAK_URL", "DPMC_KEYCLOAK_REALM", "DPMC_CLIENT_ID"):
        monkeypatch.delenv(var, raising=False)
    cfg = CliConfig()
    assert cfg.api_url == "http://localhost:3000/api"
    assert cfg.keycloak_url == "http://localhost:8080"
    assert cfg.keycloak_realm == "dpmc"
    assert cfg.client_id == "dpmc-api"


def test_env_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DPMC_API_URL", "https://api.example.com/api")
    monkeypatch.setenv("DPMC_KEYCLOAK_REALM", "prod")
    cfg = CliConfig()
    assert cfg.api_url == "https://api.example.com/api"
    assert cfg.keycloak_realm == "prod"


def test_derived_endpoints() -> None:
    cfg = CliConfig(
        keycloak_url="http://kc.example.com",
        keycloak_realm="dpmc",
    )
    assert cfg.issuer == "http://kc.example.com/realms/dpmc"
    assert cfg.device_endpoint == "http://kc.example.com/realms/dpmc/protocol/openid-connect/auth/device"
    assert cfg.token_endpoint == "http://kc.example.com/realms/dpmc/protocol/openid-connect/token"
    assert cfg.logout_endpoint == "http://kc.example.com/realms/dpmc/protocol/openid-connect/logout"
