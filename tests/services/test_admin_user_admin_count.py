from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.core.roles import ADMIN, USER
from app.models.user import User
from app.services.admin_users import AdminUserService


def _user(*, role: str = USER, is_active: bool = True) -> User:
    user = User(
        email="u@example.com",
        hashed_password="hash",
        role=role,
        is_active=is_active,
    )
    user.id = uuid4()
    return user


@pytest.mark.asyncio
async def test_active_admin_count_after_demotion() -> None:
    service = AdminUserService(AsyncMock())
    service.users = MagicMock()
    service.users.count_active_admins = AsyncMock(return_value=2)

    admin = _user(role=ADMIN, is_active=True)
    projected = await service._active_admin_count_after(admin, {"role": USER})
    assert projected == 1


@pytest.mark.asyncio
async def test_active_admin_count_after_promotion() -> None:
    service = AdminUserService(AsyncMock())
    service.users = MagicMock()
    service.users.count_active_admins = AsyncMock(return_value=1)

    regular = _user(role=USER, is_active=True)
    projected = await service._active_admin_count_after(regular, {"role": ADMIN})
    assert projected == 2


@pytest.mark.asyncio
async def test_active_admin_count_unchanged_for_non_admin_changes() -> None:
    service = AdminUserService(AsyncMock())
    service.users = MagicMock()
    service.users.count_active_admins = AsyncMock(return_value=3)

    regular = _user(role=USER, is_active=True)
    projected = await service._active_admin_count_after(regular, {"is_active": False})
    assert projected == 3
