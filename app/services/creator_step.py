import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.creator.pipelines import get_pipeline, next_step_key, step_index
from app.models.creator import ContentProject, ProjectStepArtifact
from app.models.user import User
from app.repositories.creator_artifact import CreatorArtifactRepository
from app.schemas.creator import ProjectOut, StepArtifactOut
from app.services.creator_project import CreatorProjectService


class CreatorStepService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        projects: CreatorProjectService,
    ) -> None:
        self.session = session
        self.projects = projects
        self.artifacts = CreatorArtifactRepository(session)

    def _validate_step(self, project: ContentProject, step_key: str) -> None:
        try:
            step_index(project.pipeline_id, step_key)
        except ValueError as exc:
            raise AppException("Invalid step", code=40019, status_code=400) from exc

    async def open_step(
        self,
        user: User,
        project_id: uuid.UUID,
        step_key: str,
    ) -> ProjectOut:
        project = await self.projects.get_owned(user, project_id)
        self.projects.ensure_editable(project)
        self._validate_step(project, step_key)
        if step_key == project.current_step_key:
            return await self.projects.to_out(project)

        artifact = await self.artifacts.get_latest(project.id, step_key)
        if artifact is None:
            raise AppException(
                "Step has not been confirmed yet",
                code=40024,
                status_code=400,
            )

        project.current_step_key = step_key
        drafts = dict(project.draft_content)
        drafts[step_key] = artifact.content
        project.draft_content = drafts
        await self.projects.projects.save(project)
        return await self.projects.to_out(project)

    async def save_draft(
        self,
        user: User,
        project_id: uuid.UUID,
        step_key: str,
        content: str,
    ) -> ProjectOut:
        project = await self.projects.get_owned(user, project_id)
        self.projects.ensure_editable(project)
        self._validate_step(project, step_key)
        if step_key != project.current_step_key:
            raise AppException(
                "Can only edit draft for the current step",
                code=40011,
                status_code=400,
            )
        drafts = dict(project.draft_content)
        drafts[step_key] = content
        project.draft_content = drafts
        await self.projects.projects.save(project)
        return await self.projects.to_out(project)

    async def confirm_step(
        self,
        user: User,
        project_id: uuid.UUID,
        step_key: str,
        content: str | None = None,
    ) -> ProjectOut:
        project = await self.projects.get_owned(user, project_id)
        self.projects.ensure_editable(project)
        self._validate_step(project, step_key)
        if step_key != project.current_step_key:
            raise AppException(
                "Can only confirm the current step",
                code=40012,
                status_code=400,
            )

        body = content if content is not None else project.draft_content.get(step_key, "")
        if not str(body).strip():
            raise AppException("Step content cannot be empty", code=40013, status_code=400)

        version = await self.artifacts.next_version(project.id, step_key)
        artifact = ProjectStepArtifact(
            project_id=project.id,
            step_key=step_key,
            content=str(body),
            version=version,
        )
        await self.artifacts.create(artifact)

        drafts = dict(project.draft_content)
        drafts.pop(step_key, None)
        project.draft_content = drafts

        if step_key != "publish":
            nxt = next_step_key(project.pipeline_id, step_key)
            if nxt is not None:
                project.current_step_key = nxt

        await self.projects.projects.save(project)
        return await self.projects.to_out(project)

    async def list_artifacts(self, user: User, project_id: uuid.UUID) -> list[StepArtifactOut]:
        project = await self.projects.get_owned(user, project_id)
        rows = await self.artifacts.list_for_project(project.id)
        return [
            StepArtifactOut(
                step_key=a.step_key,
                content=a.content,
                version=a.version,
                confirmed_at=a.confirmed_at,
            )
            for a in rows
        ]

    async def gather_confirmed_context(self, project: ContentProject) -> str:
        latest = await self.artifacts.list_latest_by_step(project.id)
        by_step = {artifact.step_key: artifact for artifact in latest}
        pipeline = get_pipeline(project.pipeline_id)
        lines: list[str] = [f"选题: {project.title}"]
        for step in pipeline.steps:
            if step.key == "publish":
                continue
            artifact = by_step.get(step.key)
            if artifact is not None:
                lines.append(f"\n## {step.title}\n{artifact.content}")
        return "\n".join(lines)
