from domain.edges import evaluate_edge_condition


def _ctx(**over):
    base = {"params": {}, "mode": "Generic", "data_available": lambda _id: False}
    base.update(over)
    return base


def test_always_true():
    assert evaluate_edge_condition({"kind": "always"}, **_ctx()) is True


def test_param_eq_match():
    assert evaluate_edge_condition(
        {"kind": "param", "path": "foo", "op": "eq", "value": 1},
        **_ctx(params={"foo": 1}),
    )


def test_param_eq_mismatch():
    assert not evaluate_edge_condition(
        {"kind": "param", "path": "foo", "op": "eq", "value": 1},
        **_ctx(params={"foo": 2}),
    )


def test_param_neq_missing_key():
    assert evaluate_edge_condition(
        {"kind": "param", "path": "missing", "op": "neq", "value": 1},
        **_ctx(),
    )


def test_param_gt_requires_numeric():
    assert evaluate_edge_condition(
        {"kind": "param", "path": "foo", "op": "gt", "value": 1},
        **_ctx(params={"foo": 5}),
    )
    assert not evaluate_edge_condition(
        {"kind": "param", "path": "foo", "op": "gt", "value": 1},
        **_ctx(params={"foo": "two"}),
    )


def test_mode_in_whitelist():
    assert evaluate_edge_condition(
        {"kind": "mode", "in": ["Reprocessing", "OnDemand"]},
        **_ctx(mode="Reprocessing"),
    )
    assert not evaluate_edge_condition(
        {"kind": "mode", "in": ["Reprocessing"]},
        **_ctx(mode="Test"),
    )


def test_data_available_delegates_to_callback():
    captured: list[int] = []

    def cb(pt: int) -> bool:
        captured.append(pt)
        return True

    assert evaluate_edge_condition(
        {"kind": "dataAvailable", "productTypeId": 42, "timeoutMs": 100},
        **_ctx(data_available=cb),
    )
    assert captured == [42]


def test_unknown_kind_returns_false():
    assert not evaluate_edge_condition({"kind": "what"}, **_ctx())
