import pytest

from domain.dispatch import (
    AGING_CAP_S,
    AGING_COEF,
    CLASS_WEIGHTS,
    effective_priority,
    find_best_host,
    sort_ready_jobs,
)
from domain.enums import PriorityClass

# ---- effective_priority ----

def test_effective_priority_combines_class_project_aging():
    now_ms = 1_700_000_000_000
    out = effective_priority({
        "priority": 10,
        "class": "nrt",
        "project_weight": 2.0,
        "ready_since_ms": now_ms - 60_000,
    }, now_ms)
    assert out == pytest.approx(10 * CLASS_WEIGHTS[PriorityClass.NRT] * 2 + 60 * AGING_COEF, rel=1e-9)


def test_effective_priority_caps_aging():
    now_ms = 1_700_000_000_000
    age_year_s = 365 * 24 * 3600
    out = effective_priority({
        "priority": 1,
        "class": "on_demand",
        "project_weight": 1.0,
        "ready_since_ms": now_ms - age_year_s * 1000,
    }, now_ms)
    assert out == pytest.approx(
        1 * CLASS_WEIGHTS[PriorityClass.ON_DEMAND] * 1 + AGING_CAP_S * AGING_COEF,
        rel=1e-9,
    )


def test_effective_priority_clamps_negative_age():
    now_ms = 1_700_000_000_000
    out = effective_priority({
        "priority": 1,
        "class": "on_demand",
        "project_weight": 1.0,
        "ready_since_ms": now_ms + 60_000,  # future
    }, now_ms)
    assert out == 1.0


# ---- sort_ready_jobs ----

def test_sort_ready_jobs_higher_class_first():
    now_ms = 1_700_000_000_000
    jobs = [
        {"id": 1, "priority": 1, "class": "on_demand", "project_weight": 1, "ready_since_ms": now_ms - 60_000},
        {"id": 2, "priority": 1, "class": "nrt",       "project_weight": 1, "ready_since_ms": now_ms},
    ]
    out = sort_ready_jobs(jobs, now_ms)
    assert out[0]["id"] == 2
    assert out[1]["id"] == 1


# ---- find_best_host ----

def _host(**over):
    base = {
        "id": 1,
        "cores": 8,
        "ram": 16_000_000_000,
        "disk": 200_000_000_000,
        "has_gpu": False,
        "gpu_free": [],
        "status": "up",
        "container_runtime": "docker",
        "alloc_cores": 0,
        "alloc_ram": 0,
        "alloc_disk": 0,
    }
    base.update(over)
    return base


_NEED = {
    "cores": 2,
    "ram": 4_000_000_000,
    "disk": 10_000_000_000,
    "requires_gpu": False,
    "gpu_count": 0,
    "runtime": "docker",
}


def test_find_best_host_returns_none_when_no_fit():
    assert find_best_host(_NEED, [_host(cores=1)]) is None


def test_find_best_host_picks_most_free():
    # Least-loaded / worst-fit: spread onto the emptiest host, not bin-pack the
    # tightest one. Workers are single-slot, so packing would idle the big host.
    big = _host(id=2, cores=32, ram=64_000_000_000, disk=1_000_000_000_000)
    tight = _host(id=3, cores=4, ram=8_000_000_000, disk=50_000_000_000)
    assert find_best_host(_NEED, [big, tight])["id"] == 2


def test_find_best_host_spreads_across_equal_hosts():
    # Simulate the dispatch_tick loop: after each placement its free capacity is
    # decremented in-memory, so consecutive 1-core jobs must round-robin across
    # the fleet rather than all land on the first host.
    hosts = [_host(id=i, cores=8, alloc_cores=0) for i in (10, 11, 12)]
    need = {**_NEED, "cores": 1}
    picked = []
    for _ in range(3):
        h = find_best_host(need, hosts)
        picked.append(h["id"])
        next(x for x in hosts if x["id"] == h["id"])["alloc_cores"] += 1
    assert sorted(picked) == [10, 11, 12]  # one each, not all on id=10


def test_find_best_host_refuses_gpu_on_non_gpu_host():
    need = {**_NEED, "requires_gpu": True, "gpu_count": 1}
    assert find_best_host(need, [_host(has_gpu=False)]) is None


def test_find_best_host_skips_off_or_maintenance():
    assert find_best_host(_NEED, [_host(status="off")]) is None
    assert find_best_host(_NEED, [_host(status="maintenance")]) is None
    assert find_best_host(_NEED, [_host(status="busy")]) is None


def test_find_best_host_respects_existing_allocations():
    assert find_best_host(_NEED, [_host(cores=8, alloc_cores=6)])["id"] == 1
    assert find_best_host(_NEED, [_host(cores=8, alloc_cores=7)]) is None


def test_find_best_host_runtime_none_accepts_any():
    need = {**_NEED, "runtime": "none"}
    assert find_best_host(need, [_host(container_runtime="apptainer")]) is not None
    assert find_best_host(need, [_host(container_runtime="docker")]) is not None
    assert find_best_host(need, [_host(container_runtime="kubernetes")]) is not None


def test_find_best_host_kubernetes_satisfies_docker():
    # A Kubernetes host runs OCI images, so it serves a Docker requirement.
    need = {**_NEED, "runtime": "docker"}
    assert find_best_host(need, [_host(container_runtime="kubernetes")]) is not None


def test_find_best_host_docker_need_refuses_apptainer_host():
    need = {**_NEED, "runtime": "docker"}
    assert find_best_host(need, [_host(container_runtime="apptainer")]) is None


def test_find_best_host_apptainer_need_refuses_kubernetes_host():
    # Kubernetes serves OCI images only — not Apptainer SIFs.
    need = {**_NEED, "runtime": "apptainer"}
    assert find_best_host(need, [_host(container_runtime="kubernetes")]) is None
