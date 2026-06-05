"""Tests for the OAuth2 Device Authorization flow."""

from __future__ import annotations

import pytest
import respx
from httpx import Response

from dpmc_cli.auth.device_flow import DeviceFlow, DeviceFlowError
from dpmc_cli.config import CliConfig


@pytest.fixture
def cfg() -> CliConfig:
    return CliConfig(
        keycloak_url="http://kc",
        keycloak_realm="dpmc",
        client_id="dpmc-api",
    )


def _initiate_response() -> dict[str, object]:
    return {
        "device_code": "DCODE",
        "user_code": "ABCD-EFGH",
        "verification_uri": "http://kc/realms/dpmc/device",
        "verification_uri_complete": "http://kc/realms/dpmc/device?user_code=ABCD-EFGH",
        "interval": 0,
        "expires_in": 600,
    }


@respx.mock
def test_initiate_returns_user_code(cfg: CliConfig) -> None:
    respx.post("http://kc/realms/dpmc/protocol/openid-connect/auth/device").mock(
        return_value=Response(200, json=_initiate_response())
    )
    flow = DeviceFlow(cfg)
    info = flow.initiate()
    assert info.user_code == "ABCD-EFGH"
    assert info.verification_uri_complete.startswith("http://kc/")
    assert info.device_code == "DCODE"


@respx.mock
def test_poll_handles_authorization_pending_then_success(cfg: CliConfig) -> None:
    respx.post("http://kc/realms/dpmc/protocol/openid-connect/auth/device").mock(
        return_value=Response(200, json=_initiate_response())
    )
    token_route = respx.post("http://kc/realms/dpmc/protocol/openid-connect/token")
    token_route.side_effect = [
        Response(400, json={"error": "authorization_pending"}),
        Response(400, json={"error": "slow_down"}),
        Response(
            200,
            json={
                "access_token": "AT",
                "refresh_token": "RT",
                "expires_in": 300,
                "refresh_expires_in": 1800,
            },
        ),
    ]
    flow = DeviceFlow(cfg)
    info = flow.initiate()
    tokens = flow.poll(info, sleep=lambda _s: None)
    assert tokens.access_token == "AT"
    assert tokens.refresh_token == "RT"


@respx.mock
def test_poll_raises_on_expired_token(cfg: CliConfig) -> None:
    respx.post("http://kc/realms/dpmc/protocol/openid-connect/auth/device").mock(
        return_value=Response(200, json=_initiate_response())
    )
    respx.post("http://kc/realms/dpmc/protocol/openid-connect/token").mock(
        return_value=Response(400, json={"error": "expired_token"})
    )
    flow = DeviceFlow(cfg)
    info = flow.initiate()
    with pytest.raises(DeviceFlowError, match="expired"):
        flow.poll(info, sleep=lambda _s: None)


@respx.mock
def test_poll_raises_on_access_denied(cfg: CliConfig) -> None:
    respx.post("http://kc/realms/dpmc/protocol/openid-connect/auth/device").mock(
        return_value=Response(200, json=_initiate_response())
    )
    respx.post("http://kc/realms/dpmc/protocol/openid-connect/token").mock(
        return_value=Response(400, json={"error": "access_denied"})
    )
    flow = DeviceFlow(cfg)
    info = flow.initiate()
    with pytest.raises(DeviceFlowError, match="denied"):
        flow.poll(info, sleep=lambda _s: None)


@respx.mock
def test_initiate_raises_on_connect_error(cfg: CliConfig) -> None:
    import httpx

    respx.post("http://kc/realms/dpmc/protocol/openid-connect/auth/device").mock(
        side_effect=httpx.ConnectError("no route")
    )
    flow = DeviceFlow(cfg)
    with pytest.raises(DeviceFlowError, match="cannot reach Keycloak"):
        flow.initiate()


@respx.mock
def test_initiate_sends_pkce_params_and_poll_sends_verifier(cfg: CliConfig) -> None:
    device_route = respx.post(
        "http://kc/realms/dpmc/protocol/openid-connect/auth/device"
    ).mock(return_value=Response(200, json=_initiate_response()))
    token_route = respx.post("http://kc/realms/dpmc/protocol/openid-connect/token").mock(
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

    flow = DeviceFlow(cfg)
    info = flow.initiate()
    flow.poll(info, sleep=lambda _s: None)

    device_body = dict(
        p.split("=", 1) for p in device_route.calls[0].request.content.decode().split("&")
    )
    assert device_body["code_challenge_method"] == "S256"
    assert device_body["code_challenge"]
    assert "code_verifier" not in device_body  # verifier is NEVER sent to device endpoint

    token_body = dict(
        p.split("=", 1) for p in token_route.calls[0].request.content.decode().split("&")
    )
    assert token_body["code_verifier"]
    assert "code_challenge" not in token_body  # challenge is NEVER re-sent to token endpoint
