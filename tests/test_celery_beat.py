from celery.schedules import crontab

import app.tasks.scheduled  # noqa: F401 — register tasks on the Celery app

from app.core.config import Settings
from app.tasks.celery_app import _beat_schedule, celery_app


def test_beat_schedule_entries() -> None:
    schedule = _beat_schedule(
        Settings(
            celery_beat_heartbeat_interval_seconds=120,
            jwt_secret="test-secret-key-for-jwt-signing-32chars",
        )
    )
    assert schedule["heartbeat"]["schedule"] == 120
    assert schedule["ping-redis-hourly"]["schedule"] == crontab(minute=0)
    assert schedule["nightly-maintenance"]["schedule"] == crontab(hour=3, minute=0)


def test_scheduled_tasks_registered() -> None:
    assert "app.tasks.scheduled.heartbeat" in celery_app.tasks
    assert "app.tasks.scheduled.ping_redis" in celery_app.tasks
    assert "app.tasks.scheduled.nightly_maintenance" in celery_app.tasks


def test_heartbeat_task() -> None:
    from app.tasks.scheduled import heartbeat

    assert heartbeat() == {"status": "ok"}
