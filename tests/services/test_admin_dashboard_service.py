from datetime import UTC, datetime, timedelta

import pytest
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery_keys import BEAT_HEARTBEAT_REDIS_KEY
from app.core.config import Settings
from app.services.admin_dashboard import AdminDashboardService


@pytest.fixture
def dashboard_settings() -> Settings:
    return Settings(
        environment="test",
        database_url="postgresql+asyncpg://unused",
        redis_url="redis://unused",
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
        celery_beat_heartbeat_interval_seconds=60,
    )


@pytest.mark.asyncio
async def test_beat_status_ok_when_heartbeat_recent(
    db_session: AsyncSession,
    redis_url: str,
    dashboard_settings: Settings,
) -> None:
    redis = Redis.from_url(redis_url, decode_responses=True)
    try:
        recent = datetime.now(UTC).isoformat()
        await redis.set(BEAT_HEARTBEAT_REDIS_KEY, recent)
        service = AdminDashboardService(db_session, redis, dashboard_settings)
        status, last_seen = await service._beat_status()
        assert status == "ok"
        assert last_seen is not None
    finally:
        await redis.aclose()


@pytest.mark.asyncio
async def test_beat_status_stale_when_heartbeat_too_old(
    db_session: AsyncSession,
    redis_url: str,
    dashboard_settings: Settings,
) -> None:
    redis = Redis.from_url(redis_url, decode_responses=True)
    try:
        stale = (datetime.now(UTC) - timedelta(seconds=300)).isoformat()
        await redis.set(BEAT_HEARTBEAT_REDIS_KEY, stale)
        service = AdminDashboardService(db_session, redis, dashboard_settings)
        status, last_seen = await service._beat_status()
        assert status == "stale"
        assert last_seen is not None
    finally:
        await redis.aclose()


@pytest.mark.asyncio
async def test_beat_status_unknown_when_key_missing(
    db_session: AsyncSession,
    redis_url: str,
    dashboard_settings: Settings,
) -> None:
    redis = Redis.from_url(redis_url, decode_responses=True)
    try:
        await redis.delete(BEAT_HEARTBEAT_REDIS_KEY)
        service = AdminDashboardService(db_session, redis, dashboard_settings)
        status, last_seen = await service._beat_status()
        assert status == "unknown"
        assert last_seen is None
    finally:
        await redis.aclose()
