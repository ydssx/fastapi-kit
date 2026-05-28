import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.audit_log import AuditLog
from app.repositories.user import UserRepository
from app.services.audit import AuditService


@pytest.mark.asyncio
async def test_audit_record_persists_metadata(db_session: AsyncSession) -> None:
    user = await UserRepository(db_session).create(
        email="auditor@example.com",
        hashed_password=get_password_hash("securepass123"),
    )
    actor_id = user.id
    service = AuditService(db_session)
    detail = {"field": "value"}

    log = await service.record(
        actor_id=actor_id,
        action="user.update",
        resource_type="user",
        resource_id="target-user-id",
        detail=detail,
        ip="203.0.113.10",
        user_agent="pytest-agent",
        request_id="req-trace-abc",
    )
    await db_session.commit()

    assert log.id is not None
    assert log.actor_id == actor_id
    assert log.action == "user.update"
    assert log.resource_type == "user"
    assert log.resource_id == "target-user-id"
    assert log.detail == detail
    assert log.ip == "203.0.113.10"
    assert log.user_agent == "pytest-agent"
    assert log.request_id == "req-trace-abc"

    result = await db_session.execute(select(AuditLog).where(AuditLog.id == log.id))
    stored = result.scalar_one()
    assert stored.request_id == "req-trace-abc"
