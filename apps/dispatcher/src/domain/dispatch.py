"""Pure dispatch logic — priority sorting + least-loaded host matching."""

from __future__ import annotations

from collections.abc import Iterable, Mapping

from .enums import HostStatus, PriorityClass, runtime_satisfies

CLASS_WEIGHTS: Mapping[PriorityClass, float] = {
    PriorityClass.TEST: 0.5,
    PriorityClass.ON_DEMAND: 1.0,
    PriorityClass.REPROCESSING: 1.2,
    PriorityClass.NRT: 5.0,
    PriorityClass.SUPER: 100.0,
    PriorityClass.ULTRA: 1000.0,
}

AGING_COEF = 0.01
AGING_CAP_S = 86_400  # 24h


def effective_priority(job: Mapping, now_ms: int) -> float:
    """Compute the effective scheduling priority for a Ready job."""
    age_s = max(0.0, (now_ms - job["ready_since_ms"]) / 1000.0)
    aging = AGING_COEF * min(age_s, AGING_CAP_S)
    return float(job["priority"]) * CLASS_WEIGHTS[job["class"]] * float(job["project_weight"]) + aging


def sort_ready_jobs(jobs: Iterable[Mapping], now_ms: int) -> list[dict]:
    return sorted(jobs, key=lambda j: -effective_priority(j, now_ms))  # type: ignore[arg-type]


def _fits(host: Mapping, need: Mapping) -> bool:
    if host["status"] != HostStatus.UP:
        return False
    if not runtime_satisfies(host["container_runtime"], need["runtime"]):
        return False
    if host["cores"] - host["alloc_cores"] < need["cores"]:
        return False
    if host["ram"] - host["alloc_ram"] < need["ram"]:
        return False
    if host["disk"] - host["alloc_disk"] < need["disk"]:
        return False
    if need["requires_gpu"]:
        if not host["has_gpu"]:
            return False
        if len(host["gpu_free"]) < need["gpu_count"]:
            return False
    return True


def find_best_host(need: Mapping, hosts: Iterable[Mapping]) -> dict | None:
    """Least-loaded (worst-fit): pick the host with the *largest* residual after placement.

    We deliberately spread rather than bin-pack. A DPMC worker runs one job at a
    time (a single blocking runner thread — see apps/worker runner.run), so from
    the scheduler's view a host is effectively a queue, not a pool of `nbCores`
    parallel slots. Best-fit would stack many tiny jobs (e.g. the 1-core CryoSat
    broker client) onto a single big host until its cores were full, leaving the
    other workers idle while those jobs ran serially behind one another. Placing
    each job on the currently emptiest host round-robins the load across all up
    workers, so N ready jobs run on N workers concurrently.
    """
    candidates = [h for h in hosts if _fits(h, need)]
    if not candidates:
        return None
    candidates.sort(
        key=lambda h: (
            (h["cores"] - h["alloc_cores"]) - need["cores"],
            (h["ram"] - h["alloc_ram"]) - need["ram"],
            (h["disk"] - h["alloc_disk"]) - need["disk"],
        ),
        reverse=True,  # most free capacity first → spread across the fleet
    )
    return dict(candidates[0])  # copy for stability
