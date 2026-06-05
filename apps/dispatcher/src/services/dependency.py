"""Promote Waiting jobs to Ready / Skipped based on parent statuses and edge conditions."""

from __future__ import annotations

import logging
from collections.abc import Callable, Mapping

from domain.dependencies import next_state_for_child
from domain.enums import DependencyMode, JobStatus
from repositories.products import is_data_available
from repositories.tables import T

log = logging.getLogger("dispatcher.dependency")


async def dep_tick(db) -> int:
    """Run one tick of the dependency service. Returns number of state changes.

    For every Waiting job, resolve its incoming `production_chain_x_edge`
    rows, group the matching parent Jobs by `dependencyMode`, then ask
    `domain.dependencies.next_state_for_child` whether the child should
    advance to Ready / Skipped or keep waiting.
    """
    changed = 0
    async with db.tx() as conn:
        cur = await conn.execute(
            f"""
            SELECT j.id AS job_id
            FROM {T.JOB} j
            JOIN {T.BATCH} b ON b.id = j."batchId"
            WHERE j.status = %s
              AND b."processingChainId" IS NOT NULL
            FOR UPDATE OF j SKIP LOCKED
            """,
            (JobStatus.WAITING.value,),
        )
        rows = await cur.fetchall()
        if not rows:
            return 0

        for r in rows:
            parents_by_mode = await _collect_parents(conn, r["job_id"])
            data_available = await _build_data_available(conn, parents_by_mode)
            new_state = next_state_for_child(
                parents_by_mode, data_available=data_available
            )
            if new_state == JobStatus.WAITING:
                continue
            await conn.execute(
                f'UPDATE {T.JOB} SET status = %s WHERE id = %s',
                (new_state, r["job_id"]),
            )
            changed += 1
            log.info("job %s waiting → %s", r["job_id"], new_state)
    return changed


async def _build_data_available(
    conn,
    parents_by_mode: Mapping[str, list[tuple[int, str]]],
) -> Callable[[int], bool] | None:
    """Pre-resolve catalog availability for the `on_data_available` edges.

    `next_state_for_child` is a pure, synchronous function, so the async DB
    lookups happen here: we query each distinct expected `productTypeId` once
    and hand back a plain dict-backed predicate. Returns None when the child
    has no `on_data_available` edge (so the common case adds no queries).
    """
    oda = parents_by_mode.get(DependencyMode.ON_DATA_AVAILABLE)
    if not oda:
        return None
    avail: dict[int, bool] = {}
    for product_type_id, _ in oda:
        if product_type_id not in avail:
            avail[product_type_id] = await is_data_available(conn, product_type_id)
    return lambda pid: avail.get(pid, False)


def _data_available_product_type(condition: object) -> int | None:
    """Extract the productTypeId from a `dataAvailable` edge condition.

    Returns None for a missing/other-kind/malformed condition, signalling the
    caller to keep the child waiting rather than run it without its data.
    """
    if not isinstance(condition, Mapping):
        return None
    if condition.get("kind") != "dataAvailable":
        return None
    pid = condition.get("productTypeId")
    return pid if isinstance(pid, int) else None


async def _collect_parents(
    conn,
    child_job_id: int,
) -> dict[str, list[tuple[int, str]]]:
    """Return parents grouped by DependencyMode for a child Job.

    Algorithm (per child Job J):
      1. Resolve the `processing_chain` row that produced J via
         `(batch.productionChainVersionId, J.processingScriptVersionId →
          processingScriptId)`. v1 assumption: a given ProcessingScript
         appears at most once per ProductionChainVersion, so this match
         is 1-to-1.
      2. Read every `production_chain_x_edge` whose `childChainId` is
         that node. Each row tells us the `parentChainId`, the
         `dependencyMode`, and the `condition` carried by the edge.
      3. Find the sibling Job in the same Batch whose ProcessingScript
         matches the edge's parent ProcessingChain. Group the resulting
         (parent_id, parent_status) tuples by `dependencyMode`.

    `on_data_available` edges are gated on catalog availability rather than
    the parent Job's status: we read the expected `productTypeId` from the
    edge's `dataAvailable` condition and emit `(productTypeId, "data")` so
    that `next_state_for_child` (with the predicate from
    `_build_data_available`) promotes the child once that product exists.
    """
    chain_cur = await conn.execute(
        f"""
        SELECT b."processingChainId" AS pcid
        FROM {T.JOB} j
        JOIN {T.BATCH} b ON b.id = j."batchId"
        WHERE j.id = %s
          AND b."processingChainId" IS NOT NULL
        """,
        (child_job_id,),
    )
    chain_rows = await chain_cur.fetchall()
    if not chain_rows:
        return {}
    child_pcid = chain_rows[0]["pcid"]

    # Match parent jobs by shared executionTag rather than batchId: the
    # expand-time contract is one Batch per ProcessingChain node, so a
    # child's parents live in *sibling* Batches of the same Task, all
    # tagged identically. Matching on batchId would only ever find self.
    parents_cur = await conn.execute(
        f"""
        SELECT e."dependencyMode" AS mode,
               e."condition"      AS condition,
               sib.id              AS parent_id,
               sib.status          AS parent_status
        FROM {T.PRODUCTION_CHAIN_EDGE} e
        JOIN {T.PROCESSING_CHAIN} pc_p
             ON pc_p.id = e."parentChainId"
        JOIN {T.PROCESSING_SCRIPT_VERSION} sib_psv
             ON sib_psv."processingScriptId" = pc_p."processingScriptId"
        JOIN {T.JOB} sib
             ON sib."processingScriptVersionId" = sib_psv.id
            AND sib."executionTag" = (SELECT "executionTag" FROM {T.JOB} WHERE id = %s)
            AND sib.id != %s
        WHERE e."childChainId" = %s
        """,
        (child_job_id, child_job_id, child_pcid),
    )
    parent_rows = await parents_cur.fetchall()

    grouped: dict[str, list[tuple[int, str]]] = {}
    for r in parent_rows:
        mode = r["mode"]
        if mode == DependencyMode.ON_DATA_AVAILABLE:
            product_type_id = _data_available_product_type(r["condition"])
            if product_type_id is None:
                log.warning(
                    "on_data_available edge for child job %s has no dataAvailable "
                    "condition/productTypeId — keeping it waiting",
                    child_job_id,
                )
                # Sentinel 0: no Product has type 0, so availability is always
                # false and the child stays waiting (fail-safe) instead of
                # running without its expected data.
                grouped.setdefault(mode, []).append((0, "data"))
                continue
            grouped.setdefault(mode, []).append((product_type_id, "data"))
            continue
        grouped.setdefault(mode, []).append((r["parent_id"], r["parent_status"]))
    return grouped
