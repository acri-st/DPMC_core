"""Tests for OData $filter builder + value escaping."""

from __future__ import annotations

from dpmc_cli.api.odata import odata_filter, odata_string_literal


def test_string_literal_escapes_single_quotes() -> None:
    assert odata_string_literal("foo") == "'foo'"
    assert odata_string_literal("o'brien") == "'o''brien'"


def test_filter_eq() -> None:
    assert odata_filter([("name", "eq", "FOO")]) == "name eq 'FOO'"


def test_filter_substring() -> None:
    expr = odata_filter([("name", "substringof", "foo")])
    assert expr == "contains(name, 'foo')"


def test_filter_and_join() -> None:
    expr = odata_filter([
        ("name", "eq", "FOO"),
        ("isActive", "eq", True),
    ])
    assert expr == "name eq 'FOO' and isActive eq true"


def test_filter_bool_literals() -> None:
    assert odata_filter([("isDefault", "eq", False)]) == "isDefault eq false"


def test_filter_empty_returns_empty_string() -> None:
    assert odata_filter([]) == ""
