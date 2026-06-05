"""Typer subcommands for authentication: login, logout, whoami."""

from __future__ import annotations

import contextlib
import os
import webbrowser
from collections.abc import Iterator

import httpx
import typer

from dpmc_cli.auth.device_flow import DeviceFlow, DeviceFlowError
from dpmc_cli.auth.token_store import TokenStore
from dpmc_cli.config import CliConfig
from dpmc_cli.errors import CliError, cli_command


@contextlib.contextmanager
def _silenced_stderr() -> Iterator[None]:
    """Redirect fd 2 to /dev/null so subprocesses spawned by webbrowser stay quiet.

    Plain `sys.stderr` redirection isn't enough: helpers like `gio`/`xdg-open`
    write to fd 2 directly, bypassing Python's wrappers.
    """
    devnull = os.open(os.devnull, os.O_WRONLY)
    saved = os.dup(2)
    try:
        os.dup2(devnull, 2)
        yield
    finally:
        os.dup2(saved, 2)
        os.close(saved)
        os.close(devnull)


def login() -> None:
    """Authenticate via OAuth 2.0 Device Authorization Grant."""
    cfg = CliConfig()
    flow = DeviceFlow(cfg)
    try:
        info = flow.initiate()
    except DeviceFlowError as exc:
        raise CliError(2, f"cannot start device flow: {exc}") from exc

    typer.echo("Open this URL to sign in:")
    typer.echo(f"  {info.verification_uri_complete}")
    typer.echo(f"(Code: {info.user_code})")
    typer.echo("Waiting for authorization...")
    with contextlib.suppress(Exception), _silenced_stderr():
        webbrowser.open(info.verification_uri_complete)

    try:
        creds = flow.poll(info)
    except DeviceFlowError as exc:
        raise CliError(2, f"authorization failed: {exc}") from exc

    TokenStore(cfg).save(creds)
    typer.echo("✓ Logged in.")


def logout() -> None:
    """Revoke the refresh token (best-effort) and clear local credentials."""
    cfg = CliConfig()
    store = TokenStore(cfg)
    creds = store.load()
    if creds is None:
        return
    with contextlib.suppress(Exception):
        httpx.post(
            cfg.logout_endpoint,
            data={"client_id": cfg.client_id, "refresh_token": creds.refresh_token},
            timeout=5.0,
        )
    store.clear()


@cli_command
def whoami(ctx: typer.Context) -> None:
    """Print the authenticated user profile (`GET /api/auth/me`)."""
    from dpmc_cli.api.client import ApiClient

    cfg = CliConfig()
    client = ApiClient(cfg, TokenStore(cfg))
    body = client.get("/auth/me")
    data = body.get("data", body)
    json_mode = bool(ctx.obj and ctx.obj.get("json"))
    if json_mode:
        import json as _json

        typer.echo(_json.dumps(data))
    else:
        typer.echo(f"email: {data.get('email', '')}")
        typer.echo(f"displayName: {data.get('displayName', '')}")
        typer.echo(f"roles: {', '.join(data.get('roles', []))}")
