import csv
import io
import uuid
from collections.abc import AsyncIterator
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.audit_log import AuditLog
from app.repositories.audit_log import AuditLogRepository


class AdminAuditService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.logs = AuditLogRepository(session)

    async def list_paginated(
        self,
        *,
        page: int,
        page_size: int,
        action: str | None = None,
        actor_id: uuid.UUID | None = None,
        resource_type: str | None = None,
        since: datetime | None = None,
        until: datetime | None = None,
    ) -> tuple[list[AuditLog], int]:
        return await self.logs.list_paginated(
            page=page,
            page_size=page_size,
            action=action,
            actor_id=actor_id,
            resource_type=resource_type,
            since=since,
            until=until,
        )

    async def iter_export_rows(
        self,
        *,
        action: str | None = None,
        actor_id: uuid.UUID | None = None,
        resource_type: str | None = None,
        since: datetime | None = None,
        until: datetime | None = None,
    ) -> AsyncIterator[str]:
        max_rows = self.settings.admin_audit_export_max_rows
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            [
                "created_at",
                "action",
                "actor_id",
                "resource_type",
                "resource_id",
                "ip",
                "request_id",
                "detail",
            ]
        )
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)

        count = 0
        async for log in self.logs.iter_for_export(
            max_rows=max_rows,
            action=action,
            actor_id=actor_id,
            resource_type=resource_type,
            since=since,
            until=until,
        ):
            writer.writerow(
                [
                    log.created_at.isoformat(),
                    log.action,
                    str(log.actor_id) if log.actor_id else "",
                    log.resource_type,
                    log.resource_id or "",
                    log.ip or "",
                    log.request_id or "",
                    str(log.detail) if log.detail else "",
                ]
            )
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)
            count += 1

        if count >= max_rows:
            writer.writerow([])
            writer.writerow([f"# export truncated at {max_rows} rows"])
            yield buffer.getvalue()
