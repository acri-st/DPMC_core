"""Structured CLI errors with text/JSON emission."""

from __future__ import annotations

import functools
import json
import sys
from collections.abc import Callable
from typing import Any

import typer


class CliError(Exception):
    """An anticipated error to surface to the user.

    Exit codes follow the bash dpmc-db convention:
      1 — user error (missing flag, not found, duplicate, etc.)
      2 — connectivity / auth (cannot reach API, session expired)
      3 — server-side / unexpected
    """

    def __init__(self, exit_code: int, message: str) -> None:
        super().__init__(message)
        self.exit_code = exit_code


def emit_error(err: CliError, *, json_mode: bool) -> None:
    """Print an error to stderr in the chosen format."""
    if json_mode:
        sys.stderr.write(json.dumps({"error": str(err)}) + "\n")
    else:
        sys.stderr.write(f"dpmc-cli: error: {err}\n")


def cli_command[F: Callable[..., Any]](func: F) -> F:
    """Wrap a Typer command body so any raised `CliError` becomes an exit.

    `typer.testing.CliRunner.invoke` does not go through `run()`, so commands
    must handle `CliError` themselves to produce the expected exit code/stderr.
    """

    @functools.wraps(func)
    def wrapper(ctx: typer.Context, *args: Any, **kwargs: Any) -> Any:
        try:
            return func(ctx, *args, **kwargs)
        except CliError as err:
            json_mode = bool(ctx.obj and ctx.obj.get("json"))
            emit_error(err, json_mode=json_mode)
            raise typer.Exit(code=err.exit_code) from err

    return wrapper  # type: ignore[return-value]
