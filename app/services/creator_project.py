import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.creator import pipelines as pipelines_module
from app.creator.checklists import build_publish_checklist
from app.creator.pipelines import (
    first_step_key,
    get_pipeline,
    next_step_key,
    step_index,
)
from app.models.creator import ContentProject, ProjectStepArtifact
from app.models.user import User
from app.repositories.creator_artifact import CreatorArtifactRepository
from app.repositories.creator_project import CreatorProjectRepository
from app.schemas.creator import (
    PipelineOut,
    PipelineStepOut,
    ProjectCreate,
    ProjectOut,
    PublishChecklistItemOut,
    PublishChecklistUpdate,
    StepArtifactOut,
)
from app.services.creator_events import CreatorEventService
from app.services.creator_usage import CreatorUsageService


class CreatorProjectService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.projects = CreatorProjectRepository(session)
        self.artifacts = CreatorArtifactRepository(session)
        self.events = CreatorEventService(session)
        self.usage = CreatorUsageService(session)

    def list_pipelines(self) -> list[PipelineOut]:
        result: list[PipelineOut] = []
        for pipeline in pipelines_module.PIPELINES.values():
            result.append(
                PipelineOut(
                    id=pipeline.id,
                    title=pipeline.title,
                    description=pipeline.description,
                    steps=[
                        PipelineStepOut(
                            key=s.key,
                            title=s.title,
                            description=s.description,
                            ai_enabled=s.ai_enabled,
                        )
                        for s in pipeline.steps
                    ],
                )
            )
        return result

    async def create_project(self, user: User, payload: ProjectCreate) -> ProjectOut:
        try:
            get_pipeline(payload.pipeline_id)
        except KeyError as exc:
            raise AppException("Unknown pipeline", code=40010, status_code=400) from exc

        project = ContentProject(
            user_id=user.id,
            pipeline_id=payload.pipeline_id,
            title=payload.title.strip(),
            status="in_progress",
            current_step_key=first_step_key(payload.pipeline_id),
            target_platforms=payload.target_platform_keys,
            draft_content={},
            publish_checklist_state={},
        )
        created = await self.projects.create(project)
        await self.events.record(
            user_id=user.id,
            event_type="project.created",
            project_id=created.id,
        )
        return await self._to_out(created)

    async def list_projects(self, user: User) -> list[ProjectOut]:
        rows = await self.projects.list_for_user(user.id)
        return [await self._to_out(row, include_artifacts=False) for row in rows]

    async def get_project(self, user: User, project_id: uuid.UUID) -> ProjectOut:
        project = await self._get_owned(user, project_id)
        return await self._to_out(project)

    async def save_draft(
        self,
        user: User,
        project_id: uuid.UUID,
        step_key: str,
        content: str,
    ) -> ProjectOut:
        project = await self._get_owned(user, project_id)
        self._ensure_editable(project)
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
        await self.projects.save(project)
        return await self._to_out(project)

    async def confirm_step(
        self,
        user: User,
        project_id: uuid.UUID,
        step_key: str,
        content: str | None = None,
    ) -> ProjectOut:
        project = await self._get_owned(user, project_id)
        self._ensure_editable(project)
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

        await self.projects.save(project)
        return await self._to_out(project)

    async def list_artifacts(self, user: User, project_id: uuid.UUID) -> list[StepArtifactOut]:
        project = await self._get_owned(user, project_id)
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

    async def get_publish_checklist(
        self, user: User, project_id: uuid.UUID
    ) -> list[PublishChecklistItemOut]:
        project = await self._get_owned(user, project_id)
        template = build_publish_checklist(project.target_platforms)
        state = project.publish_checklist_state or {}
        return [
            PublishChecklistItemOut(
                platform=str(item["platform"]),
                platform_label=str(item["platform_label"]),
                item_key=str(item["item_key"]),
                label=str(item["label"]),
                checked=state.get(f"{item['platform']}:{item['item_key']}", False),
            )
            for item in template
        ]

    async def update_publish_checklist(
        self,
        user: User,
        project_id: uuid.UUID,
        payload: PublishChecklistUpdate,
    ) -> list[PublishChecklistItemOut]:
        project = await self._get_owned(user, project_id)
        self._ensure_editable(project)
        if project.current_step_key != "publish":
            raise AppException(
                "Publish checklist is only available on the publish step",
                code=40014,
                status_code=400,
            )
        state = {key: True for key in payload.checked_keys}
        project.publish_checklist_state = state
        await self.projects.save(project)
        return await self.get_publish_checklist(user, project_id)

    async def complete_project(self, user: User, project_id: uuid.UUID) -> ProjectOut:
        project = await self._get_owned(user, project_id)
        if project.status == "completed":
            raise AppException("Project already completed", code=40015, status_code=400)
        if project.current_step_key != "publish":
            raise AppException(
                "Complete the pipeline through the publish step first",
                code=40016,
                status_code=400,
            )

        pipeline = get_pipeline(project.pipeline_id)
        for step in pipeline.steps:
            if step.key == "publish":
                continue
            artifacts = await self.artifacts.list_for_project(project.id)
            if not any(a.step_key == step.key for a in artifacts):
                raise AppException(
                    f"Step '{step.title}' must be confirmed before completing",
                    code=40017,
                    status_code=400,
                )

        await self.usage.check_completed_quota(user)
        project.status = "completed"
        project.completed_at = datetime.now(UTC)
        await self.projects.save(project)
        await self.usage.increment_completed(user)
        await self.events.record(
            user_id=user.id,
            event_type="project.completed",
            project_id=project.id,
        )
        return await self._to_out(project)

    async def _get_owned(self, user: User, project_id: uuid.UUID) -> ContentProject:
        project = await self.projects.get_by_id_for_user(project_id, user.id)
        if project is None:
            raise AppException("Project not found", code=40402, status_code=404)
        return project

    def _ensure_editable(self, project: ContentProject) -> None:
        if project.status == "completed":
            raise AppException("Project is read-only", code=40018, status_code=400)

    def _validate_step(self, project: ContentProject, step_key: str) -> None:
        try:
            step_index(project.pipeline_id, step_key)
        except ValueError as exc:
            raise AppException("Invalid step", code=40019, status_code=400) from exc

    async def _to_out(
        self, project: ContentProject, *, include_artifacts: bool = True
    ) -> ProjectOut:
        artifacts: list[StepArtifactOut] = []
        if include_artifacts:
            rows = await self.artifacts.list_for_project(project.id)
            artifacts = [
                StepArtifactOut(
                    step_key=a.step_key,
                    content=a.content,
                    version=a.version,
                    confirmed_at=a.confirmed_at,
                )
                for a in rows
            ]
        return ProjectOut(
            id=project.id,
            pipeline_id=project.pipeline_id,
            title=project.title,
            status=project.status,
            current_step_key=project.current_step_key,
            target_platforms=list(project.target_platforms or []),
            draft_content=dict(project.draft_content or {}),
            publish_checklist_state=dict(project.publish_checklist_state or {}),
            created_at=project.created_at,
            updated_at=project.updated_at,
            completed_at=project.completed_at,
            artifacts=artifacts,
        )

    async def gather_confirmed_context(self, project: ContentProject) -> str:
        artifacts = await self.artifacts.list_for_project(project.id)
        pipeline = get_pipeline(project.pipeline_id)
        lines: list[str] = [f"选题: {project.title}"]
        for step in pipeline.steps:
            if step.key == "publish":
                continue
            for artifact in artifacts:
                if artifact.step_key == step.key:
                    lines.append(f"\n## {step.title}\n{artifact.content}")
        return "\n".join(lines)
