import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.repositories.audit_log import AuditLogRepository


class AuditService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.logs = AuditLogRepository(session)

    async def record(
        self,
        *,
        actor_id: uuid.UUID | None,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        detail: dict[str, Any] | None = None,
        ip: str | None = None,
        user_agent: str | None = None,
        request_id: str | None = None,
    ) -> AuditLog:
        log = AuditLog(
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=detail,
            ip=ip,
            user_agent=user_agent,
            request_id=request_id,
        )
        return await self.logs.create(log)
