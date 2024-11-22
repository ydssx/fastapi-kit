from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# 配置定时任务
celery_app.conf.beat_schedule = {
    "cleanup-old-data": {
        "task": "app.tasks.cleanup.cleanup_old_data",
        "schedule": 60 * 60 * 24,  # 每24小时执行一次
    },
}
