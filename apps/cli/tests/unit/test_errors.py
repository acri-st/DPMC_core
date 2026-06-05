"""Tests for the CliError class and JSON/text emission."""

from __future__ import annotations

import json

import pytest

from dpmc_cli.errors import CliError, emit_error


def test_emit_text(capsys: pytest.CaptureFixture[str]) -> None:
    err = CliError(2, "not logged in")
    emit_error(err, json_mode=False)
    out = capsys.readouterr()
    assert out.out == ""
    assert out.err == "dpmc-cli: error: not logged in\n"


def test_emit_json(capsys: pytest.CaptureFixture[str]) -> None:
    err = CliError(1, "Product 'FOO' not found")
    emit_error(err, json_mode=True)
    out = capsys.readouterr()
    assert out.out == ""
    body = json.loads(out.err)
    assert body == {"error": "Product 'FOO' not found"}


def test_cli_error_attrs() -> None:
    err = CliError(3, "boom")
    assert err.exit_code == 3
    assert str(err) == "boom"
