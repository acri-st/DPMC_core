"""Typer app entrypoint for the `dpmc` CLI."""

from __future__ import annotations

import sys

import typer

from dpmc_cli.auth.commands import login, logout, whoami
from dpmc_cli.errors import CliError, emit_error
from dpmc_cli.resources.product import product_app

app = typer.Typer(
    name="dpmc",
    help="DPMC command-line client.",
    no_args_is_help=True,
    add_completion=False,
    invoke_without_command=True,
)


@app.callback()
def _root(
    ctx: typer.Context,
    json_output: bool = typer.Option(
        False, "--json", help="Emit machine-readable JSON for success and errors."
    ),
) -> None:
    ctx.obj = {"json": json_output}


app.command("login")(login)
app.command("logout")(logout)
app.command("whoami")(whoami)
app.add_typer(product_app, name="product")


def run() -> int:
    """Entrypoint wrapper that maps CliError to the documented exit codes."""
    try:
        app(standalone_mode=False)
    except CliError as err:
        json_mode = "--json" in sys.argv
        emit_error(err, json_mode=json_mode)
        return err.exit_code
    except typer.Exit as exc:
        return exc.exit_code
    except SystemExit as exc:  # Typer raises this on usage errors
        return int(exc.code or 0)
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
