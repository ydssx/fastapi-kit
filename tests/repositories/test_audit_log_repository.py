import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.audit_log import AuditLogRepository
from app.services.audit import AuditService


@pytest.mark.asyncio
async def test_list_for_user_includes_actor_and_target_resource_logs(
    db_session: AsyncSession,
) -> None:
    actor_id = uuid.uuid4()
    target_id = uuid.uuid4()
    audit = AuditService(db_session)

    await audit.record(
        actor_id=actor_id,
        action="user.update",
        resource_type="user",
        resource_id=str(target_id),
        detail={"is_active": False},
    )
    await audit.record(
        actor_id=target_id,
        action="auth.login",
        resource_type="session",
        resource_id="sess-1",
    )
    await db_session.commit()

    repo = AuditLogRepository(db_session)
    for_user_logs, total = await repo.list_for_user(user_id=target_id, limit=10)

    actions = {log.action for log in for_user_logs}
    assert "user.update" in actions
    assert "auth.login" in actions
    assert total >= 2


@pytest.mark.asyncio
async def test_list_paginated_filters_by_action(db_session: AsyncSession) -> None:
    audit = AuditService(db_session)
    await audit.record(
        actor_id=None,
        action="alpha.event",
        resource_type="system",
    )
    await audit.record(
        actor_id=None,
        action="beta.event",
        resource_type="system",
    )
    await db_session.commit()

    repo = AuditLogRepository(db_session)
    items, total = await repo.list_paginated(action="alpha.event")

    assert total == 1
    assert len(items) == 1
    assert items[0].action == "alpha.event"
