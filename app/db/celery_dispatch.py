"""Helpers for scheduling background work only after DB visibility is guaranteed.

Default request sessions commit in ``get_db`` teardown. Early commit is reserved
for Celery visibility boundaries (worker must see the row before enqueue).
"""

from collections.abc import Callable
from typing import Any, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


async def commit_then_enqueue(
    session: AsyncSession,
    enqueue: Callable[..., T],
    *args: Any,
    **kwargs: Any,
) -> T:
    """Commit the current session, then enqueue background work.

    ``enqueue`` is typically a thin wrapper around ``task.delay(...)`` so tests
    can inject a no-op scheduler. Prefer request-scoped teardown commit for
    ordinary writes that do not need worker visibility.
    """
    await session.commit()
    return enqueue(*args, **kwargs)
