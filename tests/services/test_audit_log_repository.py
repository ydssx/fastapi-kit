import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.audit_log import AuditLogRepository
from app.services.audit import AuditService


@pytest.mark.asyncio
async def test_audit_log_list_paginated_filters_by_action_and_resource(
    db_session: AsyncSession,
) -> None:
    audit = AuditService(db_session)
    actor_id = uuid.uuid4()

    await audit.record(
        actor_id=actor_id,
        action="user.update",
        resource_type="user",
        resource_id="target-1",
    )
    await audit.record(
        actor_id=actor_id,
        action="alert.settings_update",
        resource_type="alert_settings",
        resource_id="settings-1",
    )
    await db_session.commit()

    repo = AuditLogRepository(db_session)
    items, total = await repo.list_paginated(
        page=1,
        page_size=20,
        action="user.update",
        resource_type="user",
    )
    assert total == 1
    assert len(items) == 1
    assert items[0].action == "user.update"
    assert items[0].resource_type == "user"


@pytest.mark.asyncio
async def test_audit_log_list_paginated_filters_by_actor_and_time_range(
    db_session: AsyncSession,
) -> None:
    audit = AuditService(db_session)
    actor_a = uuid.uuid4()
    actor_b = uuid.uuid4()

    await audit.record(actor_id=actor_a, action="a.action", resource_type="system")
    await audit.record(actor_id=actor_b, action="b.action", resource_type="system")
    await db_session.commit()

    since = datetime.now(UTC) - timedelta(hours=1)
    until = datetime.now(UTC) + timedelta(hours=1)

    repo = AuditLogRepository(db_session)
    items, total = await repo.list_paginated(
        page=1,
        page_size=20,
        actor_id=actor_a,
        since=since,
        until=until,
    )
    assert total == 1
    assert items[0].actor_id == actor_a
    assert items[0].action == "a.action"


@pytest.mark.asyncio
async def test_audit_log_list_for_user_includes_actor_and_target_resource(
    db_session: AsyncSession,
) -> None:
    user_id = uuid.uuid4()
    other_id = uuid.uuid4()
    audit = AuditService(db_session)

    await audit.record(
        actor_id=user_id,
        action="user.login",
        resource_type="session",
        resource_id="sess-1",
    )
    await audit.record(
        actor_id=other_id,
        action="user.update",
        resource_type="user",
        resource_id=str(user_id),
    )
    await audit.record(
        actor_id=other_id,
        action="user.update",
        resource_type="user",
        resource_id=str(other_id),
    )
    await db_session.commit()

    repo = AuditLogRepository(db_session)
    items, total = await repo.list_for_user(user_id=user_id, limit=20)
    assert total == 2
    actions = {log.action for log in items}
    assert "user.login" in actions
    assert any(log.resource_id == str(user_id) for log in items)
