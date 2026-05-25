import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.creator import CreatorEvent


class CreatorEventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        user_id: uuid.UUID,
        event_type: str,
        project_id: uuid.UUID | None = None,
        payload: dict[str, Any] | None = None,
    ) -> CreatorEvent:
        event = CreatorEvent(
            user_id=user_id,
            event_type=event_type,
            project_id=project_id,
            payload=payload or {},
        )
        self.session.add(event)
        await self.session.flush()
        return event

    async def count_by_type_since(self, event_type: str, since: datetime) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(CreatorEvent)
            .where(
                CreatorEvent.event_type == event_type,
                CreatorEvent.created_at >= since,
            )
        )
        return int(result.scalar_one())
