import uuid
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import ADMIN, USER
from app.models.user import User
from app.services.admin_users import AdminUserService


def _user(*, role: str = ADMIN, is_active: bool = True) -> User:
    return User(
        id=uuid.uuid4(),
        email="guard@example.com",
        hashed_password="hashed",
        role=role,
        is_active=is_active,
    )


@pytest.mark.asyncio
async def test_active_admin_count_decrements_when_demoting_admin(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = AdminUserService(db_session)
    monkeypatch.setattr(service.users, "count_active_admins", AsyncMock(return_value=2))

    count = await service._active_admin_count_after(
        _user(role=ADMIN, is_active=True),
        {"role": USER},
    )
    assert count == 1


@pytest.mark.asyncio
async def test_active_admin_count_increments_when_promoting_user(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = AdminUserService(db_session)
    monkeypatch.setattr(service.users, "count_active_admins", AsyncMock(return_value=1))

    count = await service._active_admin_count_after(
        _user(role=USER, is_active=True),
        {"role": ADMIN},
    )
    assert count == 2


@pytest.mark.asyncio
async def test_active_admin_count_unchanged_for_non_admin_transitions(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = AdminUserService(db_session)
    monkeypatch.setattr(service.users, "count_active_admins", AsyncMock(return_value=3))

    count = await service._active_admin_count_after(
        _user(role=USER, is_active=True),
        {"is_active": False},
    )
    assert count == 3
