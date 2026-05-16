from celery import Celery
from celery.signals import worker_process_init

from app.core.config import get_settings
from app.core.logging import setup_logging

settings = get_settings()


@worker_process_init.connect
def configure_worker_logging(**_kwargs: object) -> None:
    setup_logging(get_settings())

celery_app = Celery(
    "fastapi_kit",
    broker=str(settings.redis_url),
    backend=str(settings.redis_url),
    include=["app.tasks.example"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)
