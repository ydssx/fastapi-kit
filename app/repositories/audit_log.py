import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditLogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, log: AuditLog) -> AuditLog:
        self.session.add(log)
        await self.session.flush()
        await self.session.refresh(log)
        return log

    async def list_paginated(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        action: str | None = None,
        actor_id: uuid.UUID | None = None,
        resource_type: str | None = None,
        since: datetime | None = None,
        until: datetime | None = None,
    ) -> tuple[list[AuditLog], int]:
        query = select(AuditLog)
        count_query = select(func.count()).select_from(AuditLog)

        if action:
            query = query.where(AuditLog.action == action)
            count_query = count_query.where(AuditLog.action == action)
        if actor_id is not None:
            query = query.where(AuditLog.actor_id == actor_id)
            count_query = count_query.where(AuditLog.actor_id == actor_id)
        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)
            count_query = count_query.where(AuditLog.resource_type == resource_type)
        if since is not None:
            query = query.where(AuditLog.created_at >= since)
            count_query = count_query.where(AuditLog.created_at >= since)
        if until is not None:
            query = query.where(AuditLog.created_at <= until)
            count_query = count_query.where(AuditLog.created_at <= until)

        total_result = await self.session.execute(count_query)
        total = int(total_result.scalar_one())

        offset = (page - 1) * page_size
        result = await self.session.execute(
            query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
        )
        return list(result.scalars().all()), total
