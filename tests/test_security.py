import uuid

import pytest
from jose import JWTError

from app.core.config import Settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_subject_from_token,
    verify_token_type,
)


def _settings() -> Settings:
    return Settings(
        environment="test",
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
    )


def test_access_and_refresh_tokens_carry_expected_types() -> None:
    settings = _settings()
    user_id = uuid.uuid4()
    access = create_access_token(user_id, settings)
    refresh = create_refresh_token(user_id, settings)

    assert get_subject_from_token(access, "access", settings) == str(user_id)
    assert get_subject_from_token(refresh, "refresh", settings) == str(user_id)


def test_refresh_token_rejected_as_access_token() -> None:
    settings = _settings()
    refresh = create_refresh_token(uuid.uuid4(), settings)
    with pytest.raises(JWTError):
        get_subject_from_token(refresh, "access", settings)


def test_verify_token_type_rejects_mismatch() -> None:
    from app.core.security import decode_token

    settings = _settings()
    payload = decode_token(create_refresh_token(uuid.uuid4(), settings), settings)
    with pytest.raises(JWTError):
        verify_token_type(payload, "access")


def test_get_subject_from_token_rejects_missing_subject() -> None:
    from jose import jwt

    settings = _settings()
    token = jwt.encode(
        {"sub": "", "type": "access", "exp": 9999999999},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    with pytest.raises(JWTError):
        get_subject_from_token(token, "access", settings)
