"""Helpers to build OData v4 query strings."""

from __future__ import annotations

from typing import Literal

Operator = Literal["eq", "ne", "gt", "lt", "ge", "le", "substringof"]
Value = str | bool | int | float


def odata_string_literal(value: str) -> str:
    """Wrap a string in single quotes, doubling embedded quotes (OData v4 escape)."""
    escaped = value.replace("'", "''")
    return f"'{escaped}'"


def _format_value(value: Value) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        return odata_string_literal(value)
    return str(value)


def odata_filter(clauses: list[tuple[str, Operator, Value]]) -> str:
    """Join clauses with `and`. The `substringof` operator becomes `contains(field, value)`."""
    parts: list[str] = []
    for field, op, value in clauses:
        if op == "substringof":
            if not isinstance(value, str):
                raise ValueError("substringof requires a string value")
            parts.append(f"contains({field}, {odata_string_literal(value)})")
        else:
            parts.append(f"{field} {op} {_format_value(value)}")
    return " and ".join(parts)
