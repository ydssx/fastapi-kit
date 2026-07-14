import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.creator import CreatorUsageCounter


class CreatorUsageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create(self, user_id: uuid.UUID, year_month: str) -> CreatorUsageCounter:
        result = await self.session.execute(
            select(CreatorUsageCounter).where(
                CreatorUsageCounter.user_id == user_id,
                CreatorUsageCounter.year_month == year_month,
            )
        )
        row = result.scalar_one_or_none()
        if row is not None:
            return row
        counter = CreatorUsageCounter(user_id=user_id, year_month=year_month)
        self.session.add(counter)
        await self.session.flush()
        await self.session.refresh(counter)
        return counter

    async def save(self, counter: CreatorUsageCounter) -> CreatorUsageCounter:
        await self.session.flush()
        await self.session.refresh(counter)
        return counter
