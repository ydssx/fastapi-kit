import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.creator import ProjectStepArtifact


class CreatorArtifactRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def next_version(self, project_id: uuid.UUID, step_key: str) -> int:
        result = await self.session.execute(
            select(func.coalesce(func.max(ProjectStepArtifact.version), 0)).where(
                ProjectStepArtifact.project_id == project_id,
                ProjectStepArtifact.step_key == step_key,
            )
        )
        current = result.scalar_one()
        return int(current) + 1

    async def create(self, artifact: ProjectStepArtifact) -> ProjectStepArtifact:
        self.session.add(artifact)
        await self.session.flush()
        await self.session.refresh(artifact)
        return artifact

    async def list_for_project(self, project_id: uuid.UUID) -> list[ProjectStepArtifact]:
        result = await self.session.execute(
            select(ProjectStepArtifact)
            .where(ProjectStepArtifact.project_id == project_id)
            .order_by(ProjectStepArtifact.step_key, ProjectStepArtifact.version)
        )
        return list(result.scalars().all())

    async def get_latest(
        self, project_id: uuid.UUID, step_key: str
    ) -> ProjectStepArtifact | None:
        result = await self.session.execute(
            select(ProjectStepArtifact)
            .where(
                ProjectStepArtifact.project_id == project_id,
                ProjectStepArtifact.step_key == step_key,
            )
            .order_by(ProjectStepArtifact.version.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_latest_by_step(self, project_id: uuid.UUID) -> list[ProjectStepArtifact]:
        rows = await self.list_for_project(project_id)
        latest: dict[str, ProjectStepArtifact] = {}
        for row in rows:
            existing = latest.get(row.step_key)
            if existing is None or row.version > existing.version:
                latest[row.step_key] = row
        return list(latest.values())
