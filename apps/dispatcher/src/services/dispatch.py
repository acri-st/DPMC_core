"""Allocate Ready jobs onto Up hosts, least-loaded first (spread across the fleet)."""

from __future__ import annotations

import logging
import time
from collections.abc import Mapping

from domain.dispatch import find_best_host, sort_ready_jobs
from domain.enums import HostStatus, JobStatus, runtime_satisfies
from repositories.tables import T

log = logging.getLogger("dispatcher.dispatch")

# Throttle the "no fit" warning: keep at most one line per ~60s when the
# diagnosis hasn't changed, so a wedged scheduler doesn't drown the log.
_NO_FIT_RELOG_S = 60.0
_last_no_fit_signature: tuple[str, ...] | None = None
_last_no_fit_at: float = 0.0


def _fit_reason(host: Mapping, need: Mapping) -> str | None:
    """Return a one-token reason this host can't take this job, or None."""
    if host["status"] != HostStatus.UP:
        return f"status={host['status']}"
    if not runtime_satisfies(host["container_runtime"], need["runtime"]):
        return f"runtime={host['container_runtime']}≠{need['runtime']}"
    free_cores = host["cores"] - host["alloc_cores"]
    if free_cores < need["cores"]:
        return f"cpu free={free_cores}<need={need['cores']}"
    free_ram = host["ram"] - host["alloc_ram"]
    if free_ram < need["ram"]:
        return f"ram free={free_ram}<need={need['ram']}"
    free_disk = host["disk"] - host["alloc_disk"]
    if free_disk < need["disk"]:
        return f"disk free={free_disk}<need={need['disk']}"
    if need["requires_gpu"]:
        if not host["has_gpu"]:
            return "no GPU"
        if len(host["gpu_free"]) < need["gpu_count"]:
            return f"gpu free={len(host['gpu_free'])}<need={need['gpu_count']}"
    return None


async def dispatch_tick(db) -> int:
    """Run one tick. Returns the number of new allocations created.

    Algorithm:
      1. Load Ready jobs that don't yet have a JobAllocation, with their
         (priority, class, project weight, resource needs).
      2. Sort by effective priority (descending).
      3. Load all hosts plus current open allocations to compute free capacity.
      4. For each job in order, find_best_host → INSERT JobAllocation if any.
      5. Update in-memory free capacity for subsequent jobs in the same tick.
    """
    global _last_no_fit_signature, _last_no_fit_at

    created = 0
    async with db.tx() as conn:
        ready_cur = await conn.execute(
            f"""
            SELECT j.id                                        AS id,
                   b.priority                                  AS priority,
                   b."priorityClass"                           AS class,
                   p."priorityWeight"                          AS project_weight,
                   (EXTRACT(EPOCH FROM j."createdAt") * 1000)::BIGINT AS ready_since_ms,
                   psv."requiredCpu"                           AS cores,
                   psv."requiredRam"                           AS ram,
                   psv."requiredDisk"                          AS disk,
                   psv."requiresGpu"                           AS requires_gpu,
                   psv."gpuCount"                              AS gpu_count,
                   psv."runtime"                               AS runtime
            FROM {T.JOB} j
            JOIN {T.BATCH} b   ON b.id = j."batchId"
            JOIN {T.PROJECT} p ON p.id = j."projectId"
            JOIN {T.PROCESSING_SCRIPT_VERSION} psv ON psv.id = j."processingScriptVersionId"
            LEFT JOIN {T.JOB_ALLOCATION} a ON a."jobId" = j.id
            WHERE j.status = %s AND a.id IS NULL AND j.paused = FALSE
            FOR UPDATE OF j SKIP LOCKED
            """,
            (JobStatus.READY.value,),
        )
        ready_rows = await ready_cur.fetchall()
        if not ready_rows:
            return 0

        sorted_jobs = sort_ready_jobs(ready_rows, int(time.time() * 1000))

        host_cur = await conn.execute(
            f"""
            SELECT h.id, h."nbCores"  AS cores, h.ram, h.disk,
                   h."hasGpu"        AS has_gpu, h."gpuCount" AS gpu_count,
                   h.status, h."containerRuntime" AS container_runtime
            FROM {T.HOST} h
            """
        )
        host_rows = await host_cur.fetchall()

        alloc_cur = await conn.execute(
            f"""
            SELECT "hostId", "reservedCpu", "reservedRam", "reservedDisk", "gpuIndices"
            FROM {T.JOB_ALLOCATION}
            WHERE "releasedAt" IS NULL
            """
        )
        alloc_rows = await alloc_cur.fetchall()

        # Build host candidates with current usage.
        used_by_host: dict[int, dict[str, int | list[int]]] = {}
        for a in alloc_rows:
            cur = used_by_host.setdefault(
                a["hostId"], {"cores": 0, "ram": 0, "disk": 0, "gpus": []}
            )
            cur["cores"] += a["reservedCpu"]
            cur["ram"] += a["reservedRam"]
            cur["disk"] += a["reservedDisk"]
            cur["gpus"].extend(a["gpuIndices"] or [])  # type: ignore[union-attr]

        host_candidates: list[dict] = []
        for h in host_rows:
            used = used_by_host.get(h["id"], {"cores": 0, "ram": 0, "disk": 0, "gpus": []})
            gpu_free = [i for i in range(h["gpu_count"]) if i not in used["gpus"]] if h["has_gpu"] else []
            host_candidates.append({
                "id": h["id"],
                "cores": h["cores"],
                "ram": int(h["ram"]),
                "disk": int(h["disk"]),
                "has_gpu": h["has_gpu"],
                "gpu_free": gpu_free,
                "status": h["status"],
                "container_runtime": h["container_runtime"],
                "alloc_cores": used["cores"],
                "alloc_ram": int(used["ram"]),
                "alloc_disk": int(used["disk"]),
            })

        unallocated: list[dict] = []
        for job in sorted_jobs:
            need = {
                "cores": int(job["cores"]),
                "ram": int(job["ram"]),
                "disk": int(job["disk"]),
                "requires_gpu": bool(job["requires_gpu"]),
                "gpu_count": int(job["gpu_count"]),
                "runtime": job["runtime"],
            }
            best = find_best_host(need, host_candidates)
            if best is None:
                unallocated.append({"id": job["id"], "need": need})
                continue

            assigned_gpus = best["gpu_free"][: need["gpu_count"]] if need["requires_gpu"] else []

            await conn.execute(
                f"""
                INSERT INTO {T.JOB_ALLOCATION}
                  ("jobId", "hostId", "reservedCpu", "reservedRam", "reservedDisk", "gpuIndices")
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (job["id"], best["id"], need["cores"], need["ram"], need["disk"], assigned_gpus),
            )
            created += 1
            log.info(
                "alloc job=%s → host=%s cpu=%d ram=%d disk=%d gpus=%s",
                job["id"], best["id"], need["cores"], need["ram"], need["disk"],
                assigned_gpus or "[]",
            )

            # Update in-memory free capacity for the next iteration.
            for h in host_candidates:
                if h["id"] == best["id"]:
                    h["alloc_cores"] += need["cores"]
                    h["alloc_ram"] += need["ram"]
                    h["alloc_disk"] += need["disk"]
                    if need["requires_gpu"]:
                        h["gpu_free"] = [g for g in h["gpu_free"] if g not in assigned_gpus]
                    break

        if unallocated:
            sample = unallocated[0]
            need = sample["need"]
            # Compute reason per host for this sample job — useful diagnostic
            # when 0 hosts fit despite hosts being up.
            per_host = [(h["id"], _fit_reason(h, need)) for h in host_candidates]
            reason_counts: dict[str, int] = {}
            for _, r in per_host:
                if r is None:
                    continue
                key = r.split(" ")[0]  # group by first token (status, runtime, cpu, ram, disk, gpu)
                reason_counts[key] = reason_counts.get(key, 0) + 1
            signature = tuple(sorted(f"{k}:{v}" for k, v in reason_counts.items()))

            now = time.monotonic()
            should_log = (
                signature != _last_no_fit_signature
                or now - _last_no_fit_at >= _NO_FIT_RELOG_S
            )
            if should_log:
                _last_no_fit_signature = signature
                _last_no_fit_at = now
                gpu_part = f" gpu={need['gpu_count']}" if need["requires_gpu"] else ""
                summary = ", ".join(f"{k}={v}" for k, v in reason_counts.items()) or "n/a"
                log.warning(
                    "no fit: %d/%d ready unallocated; sample job=%s "
                    "need cpu=%d ram=%d disk=%d%s runtime=%s; "
                    "rejections by reason: %s",
                    len(unallocated), len(sorted_jobs), sample["id"],
                    need["cores"], need["ram"], need["disk"], gpu_part, need["runtime"],
                    summary,
                )
                # Per-host detail at DEBUG so it's available with log_level=DEBUG.
                for host_id, reason in per_host:
                    log.debug("no fit detail: host=%s %s", host_id, reason or "fits!")
    return created
