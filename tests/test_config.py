import json

import pytest
from pydantic import ValidationError

from app.core.config import Settings, _DEFAULT_JWT_SECRET


def test_prod_rejects_default_jwt_secret() -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(
            environment="prod",
            jwt_secret=_DEFAULT_JWT_SECRET,
            database_url="postgresql+asyncpg://unused",
            redis_url="redis://unused",
        )


def test_prod_accepts_custom_jwt_secret() -> None:
    settings = Settings(
        environment="prod",
        jwt_secret="production-secret-with-enough-entropy",
        database_url="postgresql+asyncpg://unused",
        redis_url="redis://unused",
    )
    assert settings.is_production


def test_cors_origins_parsed_from_json_string() -> None:
    origins = json.dumps(["https://app.example.com", "https://admin.example.com"])
    settings = Settings(
        cors_origins=origins,
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
    )
    assert settings.cors_origins == [
        "https://app.example.com",
        "https://admin.example.com",
    ]


def test_cors_origins_parsed_from_list() -> None:
    settings = Settings(
        cors_origins=["http://localhost:3000"],
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
    )
    assert settings.cors_origins == ["http://localhost:3000"]
