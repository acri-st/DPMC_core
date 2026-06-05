"""Worker configuration loaded from ``DPMC_*`` and ``S3_*`` environment variables."""

from __future__ import annotations

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class S3Config(BaseSettings):
    """S3/MinIO credentials used by the staging layer.

    Distinct env prefix (``S3_``) so the same values can be shared verbatim
    with the API and the prisma seeder (which don't use the ``DPMC_`` prefix).
    """

    model_config = SettingsConfigDict(
        env_prefix="S3_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    endpoint: str = Field(..., min_length=1)
    region: str = "us-east-1"
    access_key: str = Field(..., min_length=1)
    secret_key: str = Field(..., min_length=1)
    bucket: str = Field(..., min_length=1)
    force_path_style: bool = True

LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
SchedulingPriority = Literal["Low", "Medium", "High"]


class WorkerConfig(BaseSettings):
    """Runtime configuration.

    Loaded from the process environment, with optional ``.env`` fallback in the
    current working directory (development convenience).
    """

    model_config = SettingsConfigDict(
        env_prefix="DPMC_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_url: str = Field(..., min_length=1)
    worker_token: str = Field(..., min_length=20)
    data_center_code: str = Field(..., min_length=1)
    processing_dir: str = Field(..., min_length=1)
    cache_dir: str = Field(..., min_length=1)
    scheduling_priority: SchedulingPriority = "Medium"

    heartbeat_interval_s: float = Field(default=30.0, gt=0)
    http_timeout_s: float = Field(default=10.0, gt=0)
    log_level: LogLevel = "INFO"

    log_shipping_enabled: bool = True
    log_flush_interval_s: float = Field(default=2.0, gt=0)
    log_batch_size: int = Field(default=50, gt=0, le=1000)
    log_buffer_max: int = Field(default=5000, gt=0)

    runner_enabled: bool = True
    runner_poll_interval_s: float = Field(default=2.0, gt=0)
