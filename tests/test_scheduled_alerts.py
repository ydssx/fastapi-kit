import app.tasks.scheduled  # noqa: F401 — register tasks
from app.core.config import get_settings
from app.db import session as db_session
from app.services.alert_monitor import AlertMonitorService
from app.tasks.scheduled import check_and_send_alerts


async def _noop_run_check(self: AlertMonitorService) -> None:
    return None


def test_check_and_send_alerts_runs_twice_without_event_loop_error(
    test_settings,
    monkeypatch,
) -> None:
    """Celery uses asyncio.run per invocation; engine must be disposed between runs."""
    get_settings.cache_clear()
    monkeypatch.setattr("app.core.config.get_settings", lambda: test_settings)
    monkeypatch.setattr(AlertMonitorService, "run_check", _noop_run_check)

    assert check_and_send_alerts() == {"status": "ok"}
    assert db_session._engine is None

    assert check_and_send_alerts() == {"status": "ok"}
    assert db_session._engine is None
