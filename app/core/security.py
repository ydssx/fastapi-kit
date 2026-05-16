from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import Settings, get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    result: bool = pwd_context.verify(plain_password, hashed_password)
    return result


def get_password_hash(password: str) -> str:
    hashed: str = pwd_context.hash(password)
    return hashed


def _create_token(
    subject: str,
    expires_delta: timedelta,
    token_type: str,
    settings: Settings | None = None,
) -> str:
    settings = settings or get_settings()
    expire = datetime.now(UTC) + expires_delta
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "type": token_type,
    }
    token: str = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token


def create_access_token(subject: str | UUID, settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    return _create_token(
        str(subject),
        timedelta(minutes=settings.access_token_expire_minutes),
        "access",
        settings,
    )


def create_refresh_token(subject: str | UUID, settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    return _create_token(
        str(subject),
        timedelta(days=settings.refresh_token_expire_days),
        "refresh",
        settings,
    )


def decode_token(token: str, settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or get_settings()
    payload: dict[str, Any] = jwt.decode(
        token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
    )
    return payload


def verify_token_type(payload: dict[str, Any], expected_type: str) -> None:
    if payload.get("type") != expected_type:
        raise JWTError("Invalid token type")


def get_subject_from_token(token: str, expected_type: str, settings: Settings | None = None) -> str:
    try:
        payload = decode_token(token, settings)
        verify_token_type(payload, expected_type)
        subject = payload.get("sub")
        if not subject:
            raise JWTError("Missing subject")
        return str(subject)
    except JWTError as exc:
        raise JWTError("Could not validate token") from exc
