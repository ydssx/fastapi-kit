import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.creator_event import CreatorEventRepository
from app.schemas.creator import CreatorMetricsSummary


class CreatorEventService:
    def __init__(self, session: AsyncSession) -> None:
        self.events = CreatorEventRepository(session)

    async def record(
        self,
        *,
        user_id: uuid.UUID,
        event_type: str,
        project_id: uuid.UUID | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        await self.events.create(
            user_id=user_id,
            event_type=event_type,
            project_id=project_id,
            payload=payload,
        )

    async def metrics_summary(self, days: int = 30) -> CreatorMetricsSummary:
        since = datetime.now(UTC) - timedelta(days=days)
        created = await self.events.count_by_type_since("project.created", since)
        completed = await self.events.count_by_type_since("project.completed", since)
        sessions = await self.events.count_by_type_since("user.session", since)
        outline_generated = await self.events.count_by_type_since(
            "playground.outline_generated", since
        )
        outline_refined = await self.events.count_by_type_since(
            "playground.outline_refined", since
        )
        outline_handoff = await self.events.count_outline_handoff_since(since)
        outline_handoff_completed = await self.events.count_outline_handoff_completed_since(
            since
        )
        return CreatorMetricsSummary(
            project_created=created,
            project_completed=completed,
            user_sessions=sessions,
            outline_generated=outline_generated,
            outline_refined=outline_refined,
            outline_handoff=outline_handoff,
            outline_handoff_completed=outline_handoff_completed,
        )
