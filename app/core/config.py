from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/fastapi_kit"
    )
    redis_url: str = Field(default="redis://localhost:6379/0")

    jwt_secret: str = "change-me-to-a-long-random-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]
    rate_limit_per_minute: int = 100

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

    @property
    def is_production(self) -> bool:
        return self.environment == "prod"

    @property
    def database_url_str(self) -> str:
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
