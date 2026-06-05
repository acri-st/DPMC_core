from domain.dependencies import next_state_for_child


def test_no_parents_returns_ready():
    assert next_state_for_child({}) == "ready"


def test_on_success_satisfied_when_parent_success():
    assert next_state_for_child({"on_success": [(1, "success")]}) == "ready"


def test_on_success_skipped_when_parent_failed():
    assert next_state_for_child({"on_success": [(1, "failed")]}) == "skipped"


def test_on_success_skipped_when_parent_skipped():
    assert next_state_for_child({"on_success": [(1, "skipped")]}) == "skipped"


def test_on_success_waiting_when_parent_running():
    assert next_state_for_child({"on_success": [(1, "running")]}) == "waiting"


def test_on_failure_satisfied_when_parent_failed():
    assert next_state_for_child({"on_failure": [(1, "failed")]}) == "ready"


def test_on_failure_skipped_when_parent_succeeded_terminally():
    assert next_state_for_child({"on_failure": [(1, "success")]}) == "skipped"


def test_on_completion_satisfied_when_parent_terminal():
    assert next_state_for_child({"on_completion": [(1, "failed")]}) == "ready"
    assert next_state_for_child({"on_completion": [(1, "success")]}) == "ready"
    assert next_state_for_child({"on_completion": [(1, "skipped")]}) == "ready"


def test_on_completion_waiting_while_running():
    assert next_state_for_child({"on_completion": [(1, "running")]}) == "waiting"


def test_optional_never_blocks():
    assert next_state_for_child({"optional": [(1, "running")]}) == "ready"


def test_diamond_all_success_ready():
    assert next_state_for_child({
        "on_success": [(2, "success"), (3, "success")],
    }) == "ready"


def test_diamond_partial_waiting():
    assert next_state_for_child({
        "on_success": [(2, "success"), (3, "running")],
    }) == "waiting"


def test_on_data_available_treated_as_waiting_for_now():
    assert next_state_for_child({"on_data_available": [(7, "pending")]}) == "waiting"


def test_on_data_available_with_predicate_true_means_ready():
    assert next_state_for_child(
        {"on_data_available": [(7, "data")]},
        data_available=lambda _id: True,
    ) == "ready"


def test_on_data_available_with_predicate_false_means_waiting():
    assert next_state_for_child(
        {"on_data_available": [(7, "data")]},
        data_available=lambda _id: False,
    ) == "waiting"


def test_on_data_available_default_predicate_keeps_waiting():
    assert next_state_for_child({"on_data_available": [(7, "data")]}) == "waiting"


def test_mixed_modes_all_must_pass():
    assert next_state_for_child({
        "on_success": [(1, "success")],
        "on_failure": [(2, "failed")],
    }) == "ready"

    assert next_state_for_child({
        "on_success": [(1, "success")],
        "on_failure": [(2, "success")],
    }) == "skipped"
