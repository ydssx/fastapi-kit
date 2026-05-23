import uuid

import pytest
from jose import JWTError

from app.core.config import Settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_subject_from_token,
    verify_password,
    verify_token_type,
)


@pytest.fixture
def settings() -> Settings:
    return Settings(
        environment="test",
        database_url="postgresql+asyncpg://unused",
        redis_url="redis://unused",
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
    )


def test_verify_password_round_trip() -> None:
    from app.core.security import get_password_hash

    hashed = get_password_hash("securepass123")
    assert verify_password("securepass123", hashed)
    assert not verify_password("wrong", hashed)


def test_get_subject_from_access_token(settings: Settings) -> None:
    user_id = uuid.uuid4()
    token = create_access_token(user_id, settings)
    assert get_subject_from_token(token, "access", settings) == str(user_id)


def test_refresh_token_rejected_as_access(settings: Settings) -> None:
    token = create_refresh_token(uuid.uuid4(), settings)
    with pytest.raises(JWTError):
        get_subject_from_token(token, "access", settings)


def test_verify_token_type_rejects_mismatch() -> None:
    with pytest.raises(JWTError):
        verify_token_type({"type": "refresh"}, "access")


def test_get_subject_from_token_rejects_missing_sub(settings: Settings) -> None:
    from datetime import UTC, datetime, timedelta

    from jose import jwt

    expire = datetime.now(UTC) + timedelta(minutes=5)
    token = jwt.encode(
        {"exp": expire, "type": "access"},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(JWTError):
        get_subject_from_token(token, "access", settings)
