import uuid

import pytest
from jose import JWTError, jwt

from app.core.config import Settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    get_subject_from_token,
    verify_password,
    verify_token_type,
)


@pytest.fixture
def security_settings() -> Settings:
    return Settings(
        environment="test",
        database_url="postgresql+asyncpg://unused",
        redis_url="redis://unused",
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
        access_token_expire_minutes=15,
        refresh_token_expire_days=7,
    )


def test_password_hash_roundtrip() -> None:
    hashed = get_password_hash("securepass123")
    assert verify_password("securepass123", hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_and_refresh_tokens_carry_subject(security_settings: Settings) -> None:
    user_id = uuid.uuid4()
    access = create_access_token(user_id, security_settings)
    refresh = create_refresh_token(user_id, security_settings)

    assert get_subject_from_token(access, "access", security_settings) == str(user_id)
    assert get_subject_from_token(refresh, "refresh", security_settings) == str(user_id)


def test_refresh_token_rejected_as_access(security_settings: Settings) -> None:
    token = create_refresh_token(uuid.uuid4(), security_settings)
    with pytest.raises(JWTError):
        get_subject_from_token(token, "access", security_settings)


def test_access_token_rejected_as_refresh(security_settings: Settings) -> None:
    token = create_access_token(uuid.uuid4(), security_settings)
    with pytest.raises(JWTError):
        get_subject_from_token(token, "refresh", security_settings)


def test_verify_token_type_rejects_mismatch() -> None:
    with pytest.raises(JWTError):
        verify_token_type({"type": "refresh"}, "access")


def test_verify_token_type_rejects_decoded_refresh_payload(
    security_settings: Settings,
) -> None:
    payload = decode_token(create_refresh_token(uuid.uuid4(), security_settings), security_settings)
    with pytest.raises(JWTError):
        verify_token_type(payload, "access")


def test_get_subject_from_token_rejects_missing_subject(security_settings: Settings) -> None:
    token = jwt.encode(
        {"sub": "", "type": "access", "exp": 9999999999},
        security_settings.jwt_secret,
        algorithm=security_settings.jwt_algorithm,
    )
    with pytest.raises(JWTError):
        get_subject_from_token(token, "access", security_settings)
