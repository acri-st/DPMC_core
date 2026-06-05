"""Shared scripted fakes for service-level unit tests."""

from __future__ import annotations

from contextlib import asynccontextmanager


class Cursor:
    def __init__(self, rows: list[dict]) -> None:
        self._rows = rows

    async def fetchall(self) -> list[dict]:
        return self._rows


class ScriptedConn:
    """Replay scripted query results in order, capturing INSERT/UPDATE calls."""

    def __init__(self, results: list[list[dict]]) -> None:
        self._results = list(results)
        self.inserts: list[tuple] = []
        self.updates: list[tuple] = []

    async def execute(self, sql: str, params=None):
        head = sql.lstrip().upper()
        if head.startswith("INSERT"):
            self.inserts.append((sql, params))
            return Cursor([])
        if head.startswith("UPDATE"):
            self.updates.append((sql, params))
            return Cursor([])
        return Cursor(self._results.pop(0))


class FakeDb:
    def __init__(self, conn: ScriptedConn) -> None:
        self.conn = conn

    @asynccontextmanager
    async def tx(self):
        yield self.conn
