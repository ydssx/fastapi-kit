from celery import Celery

from app.core.config import get_settings

settings = get_settings()

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
