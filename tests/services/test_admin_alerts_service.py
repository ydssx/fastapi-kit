import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.exceptions import AppException
from app.core.security import get_password_hash
from app.repositories.user import UserRepository
from app.schemas.admin_alerts import AlertSettingsUpdate
from app.services.admin_alerts import AdminAlertsService


def _settings() -> Settings:
    return Settings(
        environment="test",
        database_url="postgresql+asyncpg://unused",
        redis_url="redis://unused",
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
    )


async def _actor_id(session: AsyncSession) -> uuid.UUID:
    user = await UserRepository(session).create(
        email=f"alerts-{uuid.uuid4()}@example.com",
        hashed_password=get_password_hash("securepass123"),
    )
    return user.id


@pytest.mark.asyncio
async def test_update_settings_clears_webhook_url_and_secret(
    db_session: AsyncSession,
) -> None:
    actor_id = await _actor_id(db_session)
    service = AdminAlertsService(db_session, _settings())

    await service.update_settings(
        AlertSettingsUpdate(
            webhook_url="https://example.com/hook",
            webhook_secret="secret",
        ),
        actor_id=actor_id,
        ip="127.0.0.1",
        user_agent="pytest",
    )
    await db_session.commit()

    cleared = await service.update_settings(
        AlertSettingsUpdate(webhook_url="", clear_webhook_secret=True),
        actor_id=actor_id,
        ip=None,
        user_agent=None,
    )

    assert cleared.webhook_enabled is False
    assert cleared.webhook_secret_configured is False


@pytest.mark.asyncio
async def test_update_settings_rejects_invalid_webhook_url(db_session: AsyncSession) -> None:
    service = AdminAlertsService(db_session, _settings())
    with pytest.raises(ValueError):
        await service.update_settings(
            AlertSettingsUpdate(webhook_url="ftp://bad.example/hook"),
            actor_id=await _actor_id(db_session),
            ip=None,
            user_agent=None,
        )


@pytest.mark.asyncio
async def test_send_test_reports_failure_when_webhook_errors(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    actor_id = await _actor_id(db_session)
    service = AdminAlertsService(db_session, _settings())

    await service.update_settings(
        AlertSettingsUpdate(webhook_url="https://example.com/hook"),
        actor_id=actor_id,
        ip=None,
        user_agent=None,
    )
    await db_session.commit()

    async def boom(*_args, **_kwargs):
        raise RuntimeError("network down")

    monkeypatch.setattr("app.services.admin_alerts.post_webhook", boom)

    result = await service.send_test(
        actor_id=actor_id,
        ip=None,
        user_agent=None,
    )

    assert result.sent is False
    assert result.http_status is None
    assert "failed" in result.message.lower()


@pytest.mark.asyncio
async def test_send_test_requires_configured_webhook(db_session: AsyncSession) -> None:
    service = AdminAlertsService(db_session, _settings())
    with pytest.raises(AppException) as exc_info:
        await service.send_test(
            actor_id=await _actor_id(db_session),
            ip=None,
            user_agent=None,
        )
    assert exc_info.value.code == 40006
