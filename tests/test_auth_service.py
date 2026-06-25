import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.exceptions import AppException
from app.core.security import create_access_token
from app.repositories.user import UserRepository
from app.schemas.auth import RegisterRequest
from app.services.auth import AuthService


@pytest.mark.asyncio
async def test_login_rejects_inactive_user(
    db_session: AsyncSession, test_settings: Settings
) -> None:
    service = AuthService(db_session, test_settings)
    email = "inactive@example.com"
    password = "securepass123"

    await service.register(RegisterRequest(email=email, password=password))
    user = await UserRepository(db_session).get_by_email(email)
    assert user is not None
    user.is_active = False
    await db_session.commit()

    with pytest.raises(AppException) as exc_info:
        await service.login(email, password)

    assert exc_info.value.status_code == 403
    assert exc_info.value.code == 40102


@pytest.mark.asyncio
async def test_refresh_rejects_access_token(
    db_session: AsyncSession, test_settings: Settings
) -> None:
    service = AuthService(db_session, test_settings)
    user_id = uuid.uuid4()
    access_token = create_access_token(user_id, test_settings)

    with pytest.raises(AppException) as exc_info:
        await service.refresh(access_token)

    assert exc_info.value.status_code == 401
    assert exc_info.value.code == 40103
