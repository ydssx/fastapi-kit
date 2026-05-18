from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_JWT_SECRET = "change-me-to-a-long-random-secret-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "fastapi-kit"
    environment: Literal["dev", "prod", "test"] = "dev"
    log_level: str = "INFO"
    log_file: str | None = None
    log_file_max_bytes: int = 10 * 1024 * 1024
    log_file_backup_count: int = 5

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/fastapi_kit"
    )
    redis_url: str = Field(default="redis://localhost:6379/0")

    jwt_secret: str = _DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]
    rate_limit_per_minute: int = 100
    trust_proxy_headers: bool = False

    celery_timezone: str = "UTC"
    celery_beat_heartbeat_interval_seconds: int = 300
    celery_beat_schedule_file: str = "logs/celerybeat-schedule"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> list[str]:
        if isinstance(value, str):
            import json

            parsed: list[str] = json.loads(value)
            return parsed
        if isinstance(value, list):
            return [str(item) for item in value]
        return []

    @model_validator(mode="after")
    def reject_default_jwt_secret_in_production(self) -> "Settings":
        if self.environment == "prod" and self.jwt_secret == _DEFAULT_JWT_SECRET:
            raise ValueError(
                "JWT_SECRET must be set to a strong unique value when ENVIRONMENT=prod"
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.environment == "prod"

    @property
    def database_url_str(self) -> str:
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
