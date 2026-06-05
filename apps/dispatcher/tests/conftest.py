import pytest


@pytest.fixture(autouse=True)
def _stub_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    """Provide a default DATABASE_URL so the config doesn't fail to load."""
    monkeypatch.setenv("DPMC_DISPATCHER_DATABASE_URL", "postgresql://stub/stub")
