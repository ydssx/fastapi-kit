import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.creator import ContentProject


class CreatorProjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, project: ContentProject) -> ContentProject:
        self.session.add(project)
        await self.session.flush()
        await self.session.refresh(project)
        return project

    async def get_by_id(self, project_id: uuid.UUID) -> ContentProject | None:
        result = await self.session.execute(
            select(ContentProject).where(ContentProject.id == project_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_for_user(
        self, project_id: uuid.UUID, user_id: uuid.UUID
    ) -> ContentProject | None:
        result = await self.session.execute(
            select(ContentProject).where(
                ContentProject.id == project_id,
                ContentProject.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: uuid.UUID) -> list[ContentProject]:
        result = await self.session.execute(
            select(ContentProject)
            .where(ContentProject.user_id == user_id)
            .order_by(ContentProject.updated_at.desc())
        )
        return list(result.scalars().all())

    async def save(self, project: ContentProject) -> ContentProject:
        await self.session.flush()
        await self.session.refresh(project)
        return project
