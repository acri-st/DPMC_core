"""Pydantic-Settings config for the dpmc CLI."""

from __future__ import annotations

from pathlib import Path

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Anchored to the package directory so `./bin/dpmc` works regardless of cwd.
# Resolves to apps/cli/.env in the repo; missing file is fine (pydantic skips it).
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


def _default_config_dir() -> Path:
    import os

    xdg = os.environ.get("XDG_CONFIG_HOME")
    base = Path(xdg) if xdg else Path.home() / ".config"
    return base / "dpmc"


class CliConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="DPMC_",
        env_file=str(_ENV_FILE),
        extra="ignore",
    )

    api_url: str = "http://localhost:3000/api"
    keycloak_url: str = "http://localhost:8080"
    keycloak_realm: str = "dpmc"
    client_id: str = "dpmc-api"
    config_dir: Path = _default_config_dir()

    @computed_field  # type: ignore[prop-decorator]
    @property
    def issuer(self) -> str:
        return f"{self.keycloak_url}/realms/{self.keycloak_realm}"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def device_endpoint(self) -> str:
        return f"{self.issuer}/protocol/openid-connect/auth/device"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def token_endpoint(self) -> str:
        return f"{self.issuer}/protocol/openid-connect/token"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def logout_endpoint(self) -> str:
        return f"{self.issuer}/protocol/openid-connect/logout"

    @property
    def credentials_path(self) -> Path:
        return self.config_dir / "credentials.json"
