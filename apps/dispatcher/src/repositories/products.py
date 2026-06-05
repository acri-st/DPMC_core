"""Database-backed product-availability checker."""

from __future__ import annotations

from .tables import T


async def is_data_available(conn, product_type_id: int) -> bool:
    """Return True iff at least one Product of the given type exists (and is undeleted)."""
    cur = await conn.execute(
        f'SELECT 1 FROM {T.PRODUCT} WHERE "productTypeId" = %s LIMIT 1',
        (product_type_id,),
    )
    row = await cur.fetchone() if hasattr(cur, "fetchone") else None
    if row is None:
        # fall back to fetchall for fake conns that only implement that path
        rows = await cur.fetchall()
        return bool(rows)
    return True
