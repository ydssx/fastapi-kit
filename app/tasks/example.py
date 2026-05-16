import structlog

from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(name="app.tasks.example.send_notification")  # type: ignore[untyped-decorator]
def send_notification(user_id: str, message: str) -> dict[str, str]:
    logger.info("send_notification", user_id=user_id, message=message)
    return {"status": "sent", "user_id": user_id, "message": message}
