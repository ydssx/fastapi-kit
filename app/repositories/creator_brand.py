import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.creator import CreatorBrandProfile


class CreatorBrandRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_user(self, user_id: uuid.UUID) -> CreatorBrandProfile | None:
        result = await self.session.execute(
            select(CreatorBrandProfile).where(CreatorBrandProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def upsert(self, profile: CreatorBrandProfile) -> CreatorBrandProfile:
        self.session.add(profile)
        await self.session.flush()
        await self.session.refresh(profile)
        return profile
