from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.cache.redis import close_redis_pool, get_redis_client, init_redis_pool
from app.core.alert_keys import (
    ALERT_DEDUPE_PREFIX,
    ALERT_STATE_BEAT,
    ALERT_STATE_READY,
    ALERT_WORKER_ZERO_SINCE,
)
from app.core.config import get_settings
from app.repositories.alert import AlertSettingsRepository
from app.services.alert_monitor import AlertMonitorService


async def _reset_alert_redis() -> None:
    await get_redis_client().flushdb()


@pytest.mark.asyncio
async def test_alert_monitor_skips_without_webhook(db_engine, test_settings) -> None:
    get_settings.cache_clear()
    await init_redis_pool(test_settings)
    await _reset_alert_redis()
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    try:
        async with session_factory() as session:
            redis = get_redis_client()
            repo = AlertSettingsRepository(session)
            row = await repo.get_or_create()
            row.webhook_url = None
            await session.commit()

            await AlertMonitorService(session, redis, test_settings).run_check()
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
    await _reset_alert_redis()
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
            redis = get_redis_client()
            row = await AlertSettingsRepository(session).get_or_create()
            row.webhook_url = "https://example.com/hook"
            await session.commit()

            await AlertMonitorService(session, redis, test_settings).run_check()
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
    await _reset_alert_redis()
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
            redis = get_redis_client()
            row = await AlertSettingsRepository(session).get_or_create()
            row.webhook_url = "https://example.com/hook"
            row.recovery_notifications_enabled = True
            await session.commit()

            await redis.set(ALERT_STATE_READY, "failed")

            await AlertMonitorService(session, redis, test_settings).run_check()
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
    await _reset_alert_redis()
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    sent: list[str] = []

    async def fake_post(*, url: str, payload: dict, secret: str | None, timeout: float = 10.0):
        sent.append(payload["event"])
        return 200

    monkeypatch.setattr("app.services.alert_monitor.post_webhook", fake_post)

    async def beat_missing_snapshot(self):  # type: ignore[no-untyped-def]
        from app.services.alert_monitor import HealthSnapshot

        return HealthSnapshot(
            database_ok=True,
            redis_ok=True,
            beat_ok=False,
            worker_count=1,
        )

    monkeypatch.setattr(AlertMonitorService, "_collect_snapshot", beat_missing_snapshot)

    try:
        async with session_factory() as session:
            redis = get_redis_client()
            row = await AlertSettingsRepository(session).get_or_create()
            row.webhook_url = "https://example.com/hook"
            await session.commit()

            await AlertMonitorService(session, redis, test_settings).run_check()
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
    await _reset_alert_redis()
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
            redis = get_redis_client()
            row = await AlertSettingsRepository(session).get_or_create()
            row.webhook_url = "https://example.com/hook"
            row.recovery_notifications_enabled = True
            await session.commit()

            await redis.set(ALERT_STATE_BEAT, "missing")

            await AlertMonitorService(session, redis, test_settings).run_check()
            await session.commit()

            assert "beat_recovered" in sent
            state = await redis.get(ALERT_STATE_BEAT)
            assert state == "ok"
    finally:
        await close_redis_pool()
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_alert_monitor_dedupe_skips_repeat_ready_failed(
    db_engine,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    get_settings.cache_clear()
    await init_redis_pool(test_settings)
    await _reset_alert_redis()
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    call_count = 0

    async def fake_post(*, url: str, payload: dict, secret: str | None, timeout: float = 10.0):
        nonlocal call_count
        call_count += 1
        return 200

    monkeypatch.setattr("app.services.alert_monitor.post_webhook", fake_post)

    async def unhealthy_snapshot(self):  # type: ignore[no-untyped-def]
        from app.services.alert_monitor import HealthSnapshot

        return HealthSnapshot(
            database_ok=False,
            redis_ok=True,
            beat_ok=True,
            worker_count=1,
        )

    monkeypatch.setattr(AlertMonitorService, "_collect_snapshot", unhealthy_snapshot)

    try:
        async with session_factory() as session:
            redis = get_redis_client()
            row = await AlertSettingsRepository(session).get_or_create()
            row.webhook_url = "https://example.com/hook"
            await session.commit()

            service = AlertMonitorService(session, redis, test_settings)
            await service.run_check()
            await service.run_check()
            await session.commit()

            assert call_count == 1
            dedupe = await redis.get(f"{ALERT_DEDUPE_PREFIX}ready_failed")
            assert dedupe == "1"
    finally:
        await close_redis_pool()
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_alert_monitor_workers_missing_after_duration(
    db_engine,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    get_settings.cache_clear()
    test_settings.alert_worker_zero_enabled = True
    test_settings.alert_worker_zero_duration_seconds = 60
    await init_redis_pool(test_settings)
    await _reset_alert_redis()
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    sent: list[str] = []

    async def fake_post(*, url: str, payload: dict, secret: str | None, timeout: float = 10.0):
        sent.append(payload["event"])
        return 200

    monkeypatch.setattr("app.services.alert_monitor.post_webhook", fake_post)

    async def no_workers_snapshot(self):  # type: ignore[no-untyped-def]
        from app.services.alert_monitor import HealthSnapshot

        return HealthSnapshot(
            database_ok=True,
            redis_ok=True,
            beat_ok=True,
            worker_count=0,
        )

    monkeypatch.setattr(AlertMonitorService, "_collect_snapshot", no_workers_snapshot)

    try:
        async with session_factory() as session:
            redis = get_redis_client()
            await redis.delete(
                ALERT_STATE_READY,
                ALERT_STATE_BEAT,
                "alert:state:workers",
                ALERT_WORKER_ZERO_SINCE,
                f"{ALERT_DEDUPE_PREFIX}workers_missing",
            )
            row = await AlertSettingsRepository(session).get_or_create()
            row.webhook_url = "https://example.com/hook"
            await session.commit()

            since = (datetime.now(UTC) - timedelta(seconds=120)).isoformat()
            await redis.set(ALERT_WORKER_ZERO_SINCE, since)

            await AlertMonitorService(session, redis, test_settings).run_check()
            await session.commit()

            assert "workers_missing" in sent
            state = await redis.get("alert:state:workers")
            assert state == "missing"
    finally:
        await close_redis_pool()
        get_settings.cache_clear()
