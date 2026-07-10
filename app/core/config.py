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

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8000",
        "https://localhost",
    ]
    rate_limit_per_minute: int = 100
    trust_proxy_headers: bool = False

    celery_timezone: str = "UTC"
    celery_beat_heartbeat_interval_seconds: int = 300
    celery_beat_schedule_file: str = "logs/celerybeat-schedule"
    celery_inspect_timeout: float = 5.0
    celery_inspect_overall_timeout: float = 15.0

    admin_audit_export_max_rows: int = 5000
    admin_reported_api_replicas: int | None = None
    flower_url: str | None = None

    alert_webhook_url: str | None = None
    alert_webhook_secret: str | None = None
    alert_webhook_timeout_seconds: float = 10.0
    alert_dedupe_seconds: int = 300
    alert_check_interval_seconds: int = 120
    alert_worker_zero_enabled: bool = False
    alert_worker_zero_duration_seconds: int = 300

    loki_url: str | None = None
    loki_query_timeout_seconds: float = 15.0
    loki_max_lines: int = 500

    llm_api_key: str | None = None
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_timeout_seconds: float = 60.0

    object_storage_endpoint: str | None = None
    object_storage_region: str = "us-east-1"
    object_storage_bucket: str = "creator-media"
    object_storage_access_key: str | None = None
    object_storage_secret_key: str | None = None
    object_storage_presign_ttl_seconds: int = Field(default=900, ge=1, le=604800)
    creator_media_max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1)
    creator_media_max_width: int = Field(default=8192, ge=1)
    creator_media_max_height: int = Field(default=8192, ge=1)
    image_generation_api_key: str | None = None
    image_generation_base_url: str = "https://api.openai.com/v1"
    image_generation_model: str = "gpt-image-2"
    image_generation_timeout_seconds: float = Field(default=90.0, gt=0)
    image_generation_max_prompt_chars: int = Field(default=4000, ge=1)

    creator_free_completed_projects_per_month: int = 2
    creator_free_ai_calls_per_month: int = 50
    creator_free_playground_calls_per_month: int = 30
    creator_pro_multiplier: int = 10

    app_public_url: str = "https://localhost"
    password_reset_expire_minutes: int = 60
    password_reset_rate_limit_per_hour: int = 5
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_use_tls: bool = True

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from)

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
