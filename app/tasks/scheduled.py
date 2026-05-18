from app.core.logging import get_logger
from app.tasks.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(name="app.tasks.scheduled.heartbeat")  # type: ignore[untyped-decorator]
def heartbeat() -> dict[str, str]:
    logger.info("scheduled_heartbeat")
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
