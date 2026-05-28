from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis import close_redis_pool, init_redis_pool
from app.core.celery_keys import BEAT_HEARTBEAT_REDIS_KEY
from app.core.config import Settings
from app.services.admin_dashboard import AdminDashboardService


@pytest.fixture
async def dashboard_service(
    db_session: AsyncSession,
    test_settings: Settings,
) -> AdminDashboardService:
    await init_redis_pool(test_settings)
    from app.cache.redis import get_redis_client

    return AdminDashboardService(db_session, get_redis_client(), test_settings)


@pytest.fixture(autouse=True)
async def _redis_cleanup() -> None:
    yield
    await close_redis_pool()


@pytest.mark.asyncio
async def test_beat_status_unknown_when_missing(dashboard_service: AdminDashboardService) -> None:
    status, last_seen = await dashboard_service._beat_status()
    assert status == "unknown"
    assert last_seen is None


@pytest.mark.asyncio
async def test_beat_status_ok_for_recent_heartbeat(
    dashboard_service: AdminDashboardService,
) -> None:
    redis = dashboard_service.redis
    recent = datetime.now(UTC).isoformat()
    await redis.set(BEAT_HEARTBEAT_REDIS_KEY, recent)

    status, last_seen = await dashboard_service._beat_status()
    assert status == "ok"
    assert last_seen is not None
    assert last_seen.tzinfo is not None


@pytest.mark.asyncio
async def test_beat_status_stale_for_old_heartbeat(
    dashboard_service: AdminDashboardService,
    test_settings: Settings,
) -> None:
    redis = dashboard_service.redis
    interval = test_settings.celery_beat_heartbeat_interval_seconds
    old = datetime.now(UTC) - timedelta(seconds=interval * 2 + 1)
    await redis.set(BEAT_HEARTBEAT_REDIS_KEY, old.isoformat())

    status, last_seen = await dashboard_service._beat_status()
    assert status == "stale"
    assert last_seen is not None


@pytest.mark.asyncio
async def test_beat_status_parses_bytes_timestamp(
    dashboard_service: AdminDashboardService,
) -> None:
    redis = dashboard_service.redis
    recent = datetime.now(UTC).isoformat().encode()
    await redis.set(BEAT_HEARTBEAT_REDIS_KEY, recent)

    status, _ = await dashboard_service._beat_status()
    assert status == "ok"


@pytest.mark.asyncio
async def test_beat_status_naive_datetime_treated_as_utc(
    dashboard_service: AdminDashboardService,
) -> None:
    redis = dashboard_service.redis
    naive_recent = datetime.now(UTC).replace(tzinfo=None).isoformat()
    await redis.set(BEAT_HEARTBEAT_REDIS_KEY, naive_recent)

    status, last_seen = await dashboard_service._beat_status()
    assert status == "ok"
    assert last_seen is not None
    assert last_seen.tzinfo is not None


@pytest.mark.asyncio
async def test_beat_status_unknown_for_invalid_timestamp(
    dashboard_service: AdminDashboardService,
) -> None:
    redis = dashboard_service.redis
    await redis.set(BEAT_HEARTBEAT_REDIS_KEY, "not-a-timestamp")

    status, last_seen = await dashboard_service._beat_status()
    assert status == "unknown"
    assert last_seen is None
