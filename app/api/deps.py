import uuid
from typing import Annotated

from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis import get_redis_client
from app.core.config import Settings, get_settings
from app.core.exceptions import AppException
from app.core.security import get_subject_from_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user import UserRepository

security_scheme = HTTPBearer(auto_error=False)


async def get_redis() -> Redis:
    return get_redis_client()


async def get_settings_dep() -> Settings:
    return get_settings()


DbSession = Annotated[AsyncSession, Depends(get_db)]
RedisClient = Annotated[Redis, Depends(get_redis)]
SettingsDep = Annotated[Settings, Depends(get_settings_dep)]


async def get_current_user(
    db: DbSession,
    settings: SettingsDep,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppException(
            "Not authenticated",
            code=40100,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        subject = get_subject_from_token(credentials.credentials, "access", settings)
        user_id = uuid.UUID(subject)
    except (JWTError, ValueError) as exc:
        raise AppException("Invalid access token", code=40105, status_code=401) from exc

    user = await UserRepository(db).get_by_id(user_id)
    if not user or not user.is_active:
        raise AppException("User not found", code=40401, status_code=404)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
