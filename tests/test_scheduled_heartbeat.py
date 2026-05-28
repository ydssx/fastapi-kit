from unittest.mock import MagicMock

import app.tasks.scheduled  # noqa: F401 — register tasks
from app.tasks.scheduled import heartbeat


def test_heartbeat_returns_ok_when_redis_write_fails(monkeypatch) -> None:
    def failing_from_url(*_args, **_kwargs):
        client = MagicMock()
        client.__enter__ = MagicMock(side_effect=OSError("redis down"))
        client.__exit__ = MagicMock(return_value=False)
        return client

    monkeypatch.setattr("redis.from_url", failing_from_url)

    assert heartbeat() == {"status": "ok"}
