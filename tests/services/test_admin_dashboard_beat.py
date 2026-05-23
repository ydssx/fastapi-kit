from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.config import Settings
from app.services.admin_dashboard import AdminDashboardService


@pytest.fixture
def settings() -> Settings:
    return Settings(
        environment="test",
        database_url="postgresql+asyncpg://unused",
        redis_url="redis://unused",
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
        celery_beat_heartbeat_interval_seconds=60,
    )


def _service(redis: AsyncMock, settings: Settings) -> AdminDashboardService:
    session = MagicMock()
    return AdminDashboardService(session, redis, settings)


@pytest.mark.asyncio
async def test_beat_status_unknown_when_redis_empty(settings: Settings) -> None:
    redis = AsyncMock()
    redis.get.return_value = None
    status, last_seen = await _service(redis, settings)._beat_status()
    assert status == "unknown"
    assert last_seen is None


@pytest.mark.asyncio
async def test_beat_status_ok_for_recent_heartbeat(settings: Settings) -> None:
    redis = AsyncMock()
    recent = datetime.now(UTC) - timedelta(seconds=30)
    redis.get.return_value = recent.isoformat().encode()
    status, last_seen = await _service(redis, settings)._beat_status()
    assert status == "ok"
    assert last_seen is not None
    assert last_seen.tzinfo is not None


@pytest.mark.asyncio
async def test_beat_status_stale_when_heartbeat_expired(settings: Settings) -> None:
    redis = AsyncMock()
    max_age = settings.celery_beat_heartbeat_interval_seconds * 3
    stale = datetime.now(UTC) - timedelta(seconds=max_age)
    redis.get.return_value = stale.isoformat().encode()
    status, _ = await _service(redis, settings)._beat_status()
    assert status == "stale"


@pytest.mark.asyncio
async def test_beat_status_unknown_on_invalid_timestamp(settings: Settings) -> None:
    redis = AsyncMock()
    redis.get.return_value = b"not-a-timestamp"
    status, last_seen = await _service(redis, settings)._beat_status()
    assert status == "unknown"
    assert last_seen is None


@pytest.mark.asyncio
async def test_beat_status_unknown_when_redis_raises(settings: Settings) -> None:
    redis = AsyncMock()
    redis.get.side_effect = ConnectionError("redis down")
    status, last_seen = await _service(redis, settings)._beat_status()
    assert status == "unknown"
    assert last_seen is None
