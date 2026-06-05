"""Persist Keycloak credentials to disk with mode 0600."""

from __future__ import annotations

import contextlib
import os
from datetime import datetime
from pathlib import Path

from pydantic import BaseModel

from dpmc_cli.config import CliConfig


class StoredCredentials(BaseModel):
    issuer: str
    client_id: str
    access_token: str
    refresh_token: str
    access_token_expires_at: datetime
    refresh_token_expires_at: datetime


class TokenStore:
    def __init__(self, config: CliConfig) -> None:
        self._config = config

    @property
    def path(self) -> Path:
        return self._config.credentials_path

    def load(self) -> StoredCredentials | None:
        try:
            raw = self.path.read_text()
        except FileNotFoundError:
            return None
        return StoredCredentials.model_validate_json(raw)

    def save(self, creds: StoredCredentials) -> None:
        self._config.config_dir.mkdir(parents=True, exist_ok=True)
        os.chmod(self._config.config_dir, 0o700)
        payload = creds.model_dump_json(indent=2)
        # Atomic write
        tmp = self.path.with_suffix(".json.tmp")
        tmp.write_text(payload)
        os.chmod(tmp, 0o600)
        os.replace(tmp, self.path)

    def clear(self) -> None:
        with contextlib.suppress(FileNotFoundError):
            self.path.unlink()
