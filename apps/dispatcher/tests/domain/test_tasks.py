from domain.tasks import select_runnable_task_ids


def test_selects_only_queued_with_scheduled_in_past() -> None:
    rows = [
        {"id": 1, "status": "queued", "scheduled_start_time_ms": 0},          # past
        {"id": 2, "status": "queued", "scheduled_start_time_ms": 10**18},      # future
        {"id": 3, "status": "edited", "scheduled_start_time_ms": 0},          # not yet triggered
        {"id": 4, "status": "running", "scheduled_start_time_ms": 0},         # already running
        {"id": 5, "status": "queued", "scheduled_start_time_ms": 10**12},     # boundary == now
    ]
    now_ms = 10**12
    assert select_runnable_task_ids(rows, now_ms) == [1, 5]


def test_empty_returns_empty() -> None:
    assert select_runnable_task_ids([], 0) == []
