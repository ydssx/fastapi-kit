from datetime import UTC, datetime

from app.core.celery_keys import BEAT_HEARTBEAT_REDIS_KEY
from app.core.logging import get_logger
from app.tasks.celery_app import celery_app

logger = get_logger(__name__)


def _write_beat_heartbeat() -> None:
    import redis

    from app.core.config import get_settings

    settings = get_settings()
    ttl = max(settings.celery_beat_heartbeat_interval_seconds * 2, 60)
    payload = datetime.now(UTC).isoformat()
    with redis.from_url(str(settings.redis_url)) as client:
        client.set(BEAT_HEARTBEAT_REDIS_KEY, payload, ex=ttl)


@celery_app.task(name="app.tasks.scheduled.heartbeat")  # type: ignore[untyped-decorator]
def heartbeat() -> dict[str, str]:
    logger.info("scheduled_heartbeat")
    try:
        _write_beat_heartbeat()
    except Exception:
        logger.exception("beat_heartbeat_redis_write_failed")
    return {"status": "ok"}


@celery_app.task(name="app.tasks.scheduled.ping_redis")  # type: ignore[untyped-decorator]
def ping_redis() -> dict[str, str]:
    import redis

    from app.core.config import get_settings

    with redis.from_url(str(get_settings().redis_url)) as client:
        client.ping()
    logger.info("scheduled_redis_ping", status="ok")
    return {"status": "ok"}


@celery_app.task(name="app.tasks.scheduled.nightly_maintenance")  # type: ignore[untyped-decorator]
def nightly_maintenance() -> dict[str, str]:
    logger.info("scheduled_nightly_maintenance")
    return {"status": "ok"}


@celery_app.task(name="app.tasks.scheduled.check_and_send_alerts")  # type: ignore[untyped-decorator]
def check_and_send_alerts() -> dict[str, str]:
    import asyncio

    from app.cache.redis import close_redis_pool, init_redis_pool
    from app.core.config import get_settings
    from app.db.session import get_session_factory
    from app.services.alert_monitor import AlertMonitorService

    async def _run() -> None:
        from app.cache.redis import get_redis_client

        settings = get_settings()
        await init_redis_pool(settings)
        try:
            factory = get_session_factory(settings)
            async with factory() as session:
                await AlertMonitorService(session, get_redis_client(), settings).run_check()
                await session.commit()
        finally:
            await close_redis_pool()

    try:
        asyncio.run(_run())
    except Exception:
        logger.exception("scheduled_alert_check_failed")
    return {"status": "ok"}
