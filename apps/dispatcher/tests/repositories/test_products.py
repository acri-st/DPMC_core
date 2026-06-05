from __future__ import annotations

import pytest

from repositories.products import is_data_available


class _Cur:
    def __init__(self, rows):
        self._rows = rows

    async def fetchall(self):
        return self._rows


class _Conn:
    def __init__(self, rows):
        self._rows = rows

    async def execute(self, sql, params):
        return _Cur(self._rows)


@pytest.mark.asyncio
async def test_returns_true_when_product_exists():
    conn = _Conn([{"?column?": 1}])
    assert await is_data_available(conn, 1) is True


@pytest.mark.asyncio
async def test_returns_false_when_no_product():
    conn = _Conn([])
    assert await is_data_available(conn, 1) is False
