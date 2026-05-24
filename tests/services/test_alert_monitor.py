from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.cache.redis import close_redis_pool, init_redis_pool
from app.core.alert_keys import ALERT_STATE_BEAT, ALERT_STATE_READY, ALERT_WORKER_ZERO_SINCE
from app.core.config import get_settings
from app.repositories.alert import AlertSettingsRepository
from app.services.alert_monitor import AlertMonitorService


@pytest.mark.asyncio
async def test_alert_monitor_skips_without_webhook(db_engine, test_settings) -> None:
    get_settings.cache_clear()
    await init_redis_pool(test_settings)
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    try:
        async with session_factory() as session:
            settings = get_settings()
            from app.cache.redis import get_redis_client

            redis = get_redis_client()
            repo = AlertSettingsRepository(session)
            row = await repo.get_or_create()
            row.webhook_url = None
            await session.commit()

            await AlertMonitorService(session, redis, settings).run_check()
            await session.commit()
    finally:
        await close_redis_pool()
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_alert_monitor_ready_failed(
    db_engine,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    get_settings.cache_clear()
    await init_redis_pool(test_settings)
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    sent: list[str] = []

    async def fake_post(*, url: str, payload: dict, secret: str | None, timeout: float = 10.0):
        sent.append(payload["event"])
        return 200

    monkeypatch.setattr("app.services.alert_monitor.post_webhook", fake_post)

    async def fake_snapshot(self):  # type: ignore[no-untyped-def]
        from app.services.alert_monitor import HealthSnapshot

        return HealthSnapshot(
            database_ok=False,
            redis_ok=True,
            beat_ok=True,
            worker_count=1,
        )

    monkeypatch.setattr(AlertMonitorService, "_collect_snapshot", fake_snapshot)

    try:
        async with session_factory() as session:
            settings = get_settings()
            from app.cache.redis import get_redis_client

            redis = get_redis_client()
            row = await AlertSettingsRepository(session).get_or_create()
            row.webhook_url = "https://example.com/hook"
            await session.commit()

            await AlertMonitorService(session, redis, settings).run_check()
            await session.commit()

            assert "ready_failed" in sent
            state = await redis.get(ALERT_STATE_READY)
            assert state == "failed"
    finally:
        await close_redis_pool()
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_alert_monitor_ready_recovered_after_failure(
    db_engine,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    get_settings.cache_clear()
    await init_redis_pool(test_settings)
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    sent: list[str] = []

    async def fake_post(*, url: str, payload: dict, secret: str | None, timeout: float = 10.0):
        sent.append(payload["event"])
        return 200

    monkeypatch.setattr("app.services.alert_monitor.post_webhook", fake_post)

    async def healthy_snapshot(self):  # type: ignore[no-untyped-def]
        from app.services.alert_monitor import HealthSnapshot

        return HealthSnapshot(
            database_ok=True,
            redis_ok=True,
            beat_ok=True,
            worker_count=1,
        )

    monkeypatch.setattr(AlertMonitorService, "_collect_snapshot", healthy_snapshot)

    try:
        async with session_factory() as session:
            settings = get_settings()
            from app.cache.redis import get_redis_client

            redis = get_redis_client()
            row = await AlertSettingsRepository(session).get_or_create()
            row.webhook_url = "https://example.com/hook"
            row.recovery_notifications_enabled = True
            await session.commit()

            await redis.set(ALERT_STATE_READY, "failed")

            await AlertMonitorService(session, redis, settings).run_check()
            await session.commit()

            assert "ready_recovered" in sent
            state = await redis.get(ALERT_STATE_READY)
            assert state == "ok"
    finally:
        await close_redis_pool()
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_alert_monitor_beat_missing(
    db_engine,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    get_settings.cache_clear()
    await init_redis_pool(test_settings)
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    sent: list[str] = []

    async def fake_post(*, url: str, payload: dict, secret: str | None, timeout: float = 10.0):
        sent.append(payload["event"])
        return 200

    monkeypatch.setattr("app.services.alert_monitor.post_webhook", fake_post)

    async def snapshot_beat_down(self):  # type: ignore[no-untyped-def]
        from app.services.alert_monitor import HealthSnapshot

        return HealthSnapshot(
            database_ok=True,
            redis_ok=True,
            beat_ok=False,
            worker_count=1,
        )

    monkeypatch.setattr(AlertMonitorService, "_collect_snapshot", snapshot_beat_down)

    try:
        async with session_factory() as session:
            settings = get_settings()
            from app.cache.redis import get_redis_client

            redis = get_redis_client()
            row = await AlertSettingsRepository(session).get_or_create()
            row.webhook_url = "https://example.com/hook"
            await session.commit()

            await AlertMonitorService(session, redis, settings).run_check()
            await session.commit()

            assert "beat_missing" in sent
            state = await redis.get(ALERT_STATE_BEAT)
            assert state == "missing"
    finally:
        await close_redis_pool()
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_alert_monitor_beat_recovered_after_missing(
    db_engine,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    get_settings.cache_clear()
    await init_redis_pool(test_settings)
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    sent: list[str] = []

    async def fake_post(*, url: str, payload: dict, secret: str | None, timeout: float = 10.0):
        sent.append(payload["event"])
        return 200

    monkeypatch.setattr("app.services.alert_monitor.post_webhook", fake_post)

    async def snapshot_beat_ok(self):  # type: ignore[no-untyped-def]
        from app.services.alert_monitor import HealthSnapshot

        return HealthSnapshot(
            database_ok=True,
            redis_ok=True,
            beat_ok=True,
            worker_count=1,
        )

    monkeypatch.setattr(AlertMonitorService, "_collect_snapshot", snapshot_beat_ok)

    try:
        async with session_factory() as session:
            settings = get_settings()
            from app.cache.redis import get_redis_client

            redis = get_redis_client()
            row = await AlertSettingsRepository(session).get_or_create()
            row.webhook_url = "https://example.com/hook"
            row.recovery_notifications_enabled = True
            await session.commit()

            await redis.set(ALERT_STATE_BEAT, "missing")

            await AlertMonitorService(session, redis, settings).run_check()
            await session.commit()

            assert "beat_recovered" in sent
            state = await redis.get(ALERT_STATE_BEAT)
            assert state == "ok"
    finally:
        await close_redis_pool()
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_alert_monitor_dedupes_repeated_ready_failed(
    db_engine,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    get_settings.cache_clear()
    await init_redis_pool(test_settings)
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    sent: list[str] = []

    async def fake_post(*, url: str, payload: dict, secret: str | None, timeout: float = 10.0):
        sent.append(payload["event"])
        return 200

    monkeypatch.setattr("app.services.alert_monitor.post_webhook", fake_post)

    async def snapshot_unhealthy(self):  # type: ignore[no-untyped-def]
        from app.services.alert_monitor import HealthSnapshot

        return HealthSnapshot(
            database_ok=False,
            redis_ok=True,
            beat_ok=True,
            worker_count=1,
        )

    monkeypatch.setattr(AlertMonitorService, "_collect_snapshot", snapshot_unhealthy)

    try:
        async with session_factory() as session:
            settings = get_settings()
            from app.cache.redis import get_redis_client

            redis = get_redis_client()
            row = await AlertSettingsRepository(session).get_or_create()
            row.webhook_url = "https://example.com/hook"
            await session.commit()

            monitor = AlertMonitorService(session, redis, settings)
            await monitor.run_check()
            await session.commit()
            await monitor.run_check()
            await session.commit()

            assert sent.count("ready_failed") == 1
    finally:
        await close_redis_pool()
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_alert_monitor_workers_missing_after_zero_duration(
    db_engine,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    worker_settings = test_settings.model_copy(
        update={
            "alert_worker_zero_enabled": True,
            "alert_worker_zero_duration_seconds": 60,
        }
    )
    get_settings.cache_clear()
    monkeypatch.setattr("app.core.config.get_settings", lambda: worker_settings)
    await init_redis_pool(worker_settings)
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    sent: list[str] = []

    async def fake_post(*, url: str, payload: dict, secret: str | None, timeout: float = 10.0):
        sent.append(payload["event"])
        return 200

    monkeypatch.setattr("app.services.alert_monitor.post_webhook", fake_post)

    async def snapshot_no_workers(self):  # type: ignore[no-untyped-def]
        from app.services.alert_monitor import HealthSnapshot

        return HealthSnapshot(
            database_ok=True,
            redis_ok=True,
            beat_ok=True,
            worker_count=0,
        )

    monkeypatch.setattr(AlertMonitorService, "_collect_snapshot", snapshot_no_workers)

    try:
        async with session_factory() as session:
            from app.cache.redis import get_redis_client

            redis = get_redis_client()
            row = await AlertSettingsRepository(session).get_or_create()
            row.webhook_url = "https://example.com/hook"
            await session.commit()

            stale_since = (datetime.now(UTC) - timedelta(seconds=120)).isoformat()
            await redis.set(ALERT_WORKER_ZERO_SINCE, stale_since)

            await AlertMonitorService(session, redis, worker_settings).run_check()
            await session.commit()

            assert "workers_missing" in sent
            state = await redis.get("alert:state:workers")
            assert state == "missing"
    finally:
        await close_redis_pool()
        get_settings.cache_clear()
