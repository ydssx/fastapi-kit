from celery import Celery
from celery.schedules import crontab
from celery.signals import beat_init, worker_process_init

from app.core.config import Settings, get_settings
from app.core.logging import setup_logging


def _beat_schedule(settings: Settings) -> dict[str, dict[str, object]]:
    return {
        "heartbeat": {
            "task": "app.tasks.scheduled.heartbeat",
            "schedule": settings.celery_beat_heartbeat_interval_seconds,
        },
        "ping-redis-hourly": {
            "task": "app.tasks.scheduled.ping_redis",
            "schedule": crontab(minute=0),
        },
        "nightly-maintenance": {
            "task": "app.tasks.scheduled.nightly_maintenance",
            "schedule": crontab(hour=3, minute=0),
        },
    }


@worker_process_init.connect
def configure_worker_logging(**_kwargs: object) -> None:
    setup_logging(get_settings())


@beat_init.connect
def configure_beat_logging(**_kwargs: object) -> None:
    setup_logging(get_settings())


settings = get_settings()

celery_app = Celery(
    "fastapi_kit",
    broker=str(settings.redis_url),
    backend=str(settings.redis_url),
    include=["app.tasks.example", "app.tasks.scheduled"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.celery_timezone,
    enable_utc=True,
    task_track_started=True,
    beat_schedule=_beat_schedule(settings),
    beat_schedule_filename=settings.celery_beat_schedule_file,
)
