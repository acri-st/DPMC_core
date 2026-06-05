"""Python port of the TS evaluateEdgeCondition. Pure function — DB lookups
go through the `data_available` callable provided by the caller."""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any


def evaluate_edge_condition(
    cond: Mapping[str, Any],
    *,
    params: Mapping[str, Any],
    mode: str,
    data_available: Callable[[int], bool],
) -> bool:
    kind = cond.get("kind")
    if kind == "always":
        return True
    if kind == "param":
        path = cond["path"]
        op = cond["op"]
        v = params.get(path)
        if op == "eq":
            return v == cond["value"]
        if op == "neq":
            return v != cond["value"]
        if op == "gt":
            return isinstance(v, (int, float)) and isinstance(cond["value"], (int, float)) and v > cond["value"]
        if op == "lt":
            return isinstance(v, (int, float)) and isinstance(cond["value"], (int, float)) and v < cond["value"]
        return False
    if kind == "mode":
        allowed = cond.get("in") or []
        return mode in allowed
    if kind == "dataAvailable":
        return data_available(cond["productTypeId"])
    # Unknown kind — fail closed.
    return False
