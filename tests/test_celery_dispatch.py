import pytest
from unittest.mock import AsyncMock, MagicMock

from app.db.celery_dispatch import commit_then_enqueue


@pytest.mark.asyncio
async def test_commit_then_enqueue_commits_before_calling_scheduler() -> None:
    order: list[str] = []
    session = AsyncMock()

    async def commit() -> None:
        order.append("commit")

    session.commit = commit

    def enqueue(value: str) -> str:
        order.append(f"enqueue:{value}")
        return f"queued:{value}"

    result = await commit_then_enqueue(session, enqueue, "object-key")

    assert result == "queued:object-key"
    assert order == ["commit", "enqueue:object-key"]


@pytest.mark.asyncio
async def test_commit_then_enqueue_does_not_enqueue_when_commit_fails() -> None:
    session = AsyncMock()
    session.commit = AsyncMock(side_effect=RuntimeError("db down"))
    enqueue = MagicMock()

    with pytest.raises(RuntimeError, match="db down"):
        await commit_then_enqueue(session, enqueue, "object-key")

    enqueue.assert_not_called()
