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

    async def _ensure_live(self) -> AsyncConnection:
        """Return a usable connection, reconnecting if the current one is dead.

        A database restart or failover leaves the single long-lived connection
        broken for good: every later tick raises "the connection is lost" while
        the process itself stays up, so the dispatcher is alive, schedules
        nothing, and no liveness probe on the process notices. Reconnecting on
        demand is what makes an outage transient rather than terminal.
        """
        if self._conn is None or self._conn.closed or self._conn.broken:
            if self._conn is not None:
                try:
                    await self._conn.close()
                except Exception:  # noqa: BLE001 - already unusable
                    pass
            await self.connect()
        assert self._conn is not None
        return self._conn

    @asynccontextmanager
    async def tx(self):
        # psycopg's AsyncConnection cannot safely interleave transactions
        # across concurrent asyncio tasks (savepoints must close in LIFO
        # order), so serialize tx() calls on the shared connection.
        async with self._lock:
            conn = await self._ensure_live()
            try:
                async with conn.transaction():
                    yield conn
            except psycopg.OperationalError:
                # The connection died mid-transaction; drop it so the next tick
                # reconnects instead of reusing a broken handle forever.
                try:
                    await conn.close()
                except Exception:  # noqa: BLE001 - already unusable
                    pass
                self._conn = None
                raise
