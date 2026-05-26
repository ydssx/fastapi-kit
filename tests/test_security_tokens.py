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


@pytest.fixture
def token_settings() -> Settings:
    return Settings(
        environment="test",
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
    )


def test_verify_token_type_rejects_mismatched_type() -> None:
    with pytest.raises(JWTError, match="Invalid token type"):
        verify_token_type({"type": "refresh"}, "access")


def test_get_subject_from_token_rejects_access_token_as_refresh(
    token_settings: Settings,
) -> None:
    user_id = uuid.uuid4()
    access = create_access_token(user_id, token_settings)
    with pytest.raises(JWTError, match="Could not validate token"):
        get_subject_from_token(access, "refresh", token_settings)


def test_get_subject_from_token_accepts_matching_refresh(
    token_settings: Settings,
) -> None:
    user_id = uuid.uuid4()
    refresh = create_refresh_token(user_id, token_settings)
    assert get_subject_from_token(refresh, "refresh", token_settings) == str(user_id)
