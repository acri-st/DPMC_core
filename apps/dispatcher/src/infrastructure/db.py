"""Thin async wrapper around psycopg with row factory and transaction helper."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

import psycopg
from psycopg import AsyncConnection
from psycopg.rows import dict_row


class Db:
    def __init__(self, dsn: str) -> None:
        self._dsn = dsn
        self._conn: AsyncConnection | None = None
        self._lock = asyncio.Lock()

    async def connect(self) -> None:
        self._conn = await psycopg.AsyncConnection.connect(
            self._dsn, row_factory=dict_row, autocommit=False
        )

    async def close(self) -> None:
        if self._conn is not None:
            await self._conn.close()
            self._conn = None

    @asynccontextmanager
    async def tx(self):
        if self._conn is None:
            raise RuntimeError("Db.connect() must be called before tx()")
        # psycopg's AsyncConnection cannot safely interleave transactions
        # across concurrent asyncio tasks (savepoints must close in LIFO
        # order), so serialize tx() calls on the shared connection.
        async with self._lock, self._conn.transaction():
            yield self._conn
