from unittest.mock import MagicMock, patch

from app.services.admin_celery import (
    _build_beat_schedule,
    _inspect_broadcast,
    _normalize_worker_map,
)


def test_normalize_worker_map_accepts_dict() -> None:
    raw = {"celery@worker1": {"ok": "pong"}}
    assert _normalize_worker_map(raw) == raw


def test_normalize_worker_map_merges_list_of_single_key_dicts() -> None:
    raw = [
        {"celery@worker1": {"ok": "pong"}},
        {"celery@worker2": {"ok": "pong"}},
    ]
    merged = _normalize_worker_map(raw)
    assert set(merged.keys()) == {"celery@worker1", "celery@worker2"}


def test_normalize_worker_map_returns_empty_for_unexpected_types() -> None:
    assert _normalize_worker_map(None) == {}
    assert _normalize_worker_map("not-a-map") == {}
    assert _normalize_worker_map([1, 2, 3]) == {}


def test_inspect_broadcast_returns_empty_when_inspector_missing() -> None:
    with patch("app.services.admin_celery.celery_app.control.inspect", return_value=None):
        assert _inspect_broadcast("stats", timeout=1.0) == {}


def test_inspect_broadcast_normalizes_non_dict_results() -> None:
    inspector = MagicMock()
    inspector.stats.return_value = ["unexpected"]
    with patch("app.services.admin_celery.celery_app.control.inspect", return_value=inspector):
        assert _inspect_broadcast("stats", timeout=1.0) == {}


def test_build_beat_schedule_includes_configured_tasks() -> None:
    from app.core.config import Settings

    settings = Settings(
        environment="test",
        database_url="postgresql+asyncpg://unused",
        redis_url="redis://unused",
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
    )
    entries = _build_beat_schedule(settings)
    names = {entry.name for entry in entries}
    assert "alert-health-check" in names
    assert all(entry.task for entry in entries)
