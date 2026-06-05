from config import DispatcherConfig


def test_config_loads_from_env() -> None:
    cfg = DispatcherConfig()  # type: ignore[call-arg]
    assert cfg.database_url == "postgresql://stub/stub"
    assert cfg.api_url == "http://localhost:3000/api"
    assert cfg.task_loop_interval_s == 5.0
