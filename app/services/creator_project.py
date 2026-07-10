import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.creator import pipelines as pipelines_module
from app.creator.checklists import build_publish_checklist, summarize_publish_progress
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
    ProjectUpdate,
    PublishChecklistItemOut,
    PublishChecklistUpdate,
    PublishProgressOut,
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
            primary_platform_key=self._validate_primary_platform(
                payload.target_platform_keys,
                payload.primary_platform_key,
                require_when_multi=True,
            ),
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

    @staticmethod
    def _validate_primary_platform(
        target_platform_keys: list[str],
        primary_platform_key: str | None,
        *,
        require_when_multi: bool,
    ) -> str | None:
        platforms = list(dict.fromkeys(target_platform_keys))
        if not platforms:
            return None
        if len(platforms) == 1:
            return platforms[0]
        if primary_platform_key is None:
            if require_when_multi:
                raise AppException(
                    "Primary platform is required when multiple targets are selected",
                    code=40025,
                    status_code=400,
                )
            return None
        if primary_platform_key not in platforms:
            raise AppException(
                "Primary platform must be one of the target platforms",
                code=40025,
                status_code=400,
            )
        return primary_platform_key

    @staticmethod
    def _sync_primary_after_platform_change(project: ContentProject) -> None:
        platforms = list(project.target_platforms or [])
        if not platforms:
            project.primary_platform_key = None
            return
        if len(platforms) == 1:
            project.primary_platform_key = platforms[0]
            return
        if project.primary_platform_key in platforms:
            return
        project.primary_platform_key = None

    async def get_project(self, user: User, project_id: uuid.UUID) -> ProjectOut:
        project = await self._get_owned(user, project_id)
        return await self._to_out(project)

    async def update_project(
        self,
        user: User,
        project_id: uuid.UUID,
        payload: ProjectUpdate,
    ) -> ProjectOut:
        project = await self._get_owned(user, project_id)
        if payload.title is not None:
            project.title = payload.title.strip()
        if payload.target_platform_keys is not None:
            if project.status == "completed":
                raise AppException(
                    "Cannot change target platforms on a completed project",
                    code=40023,
                    status_code=400,
                )
            if project.current_step_key == "publish":
                raise AppException(
                    "Change target platforms before the publish step",
                    code=40023,
                    status_code=400,
                )
            project.target_platforms = payload.target_platform_keys
            project.publish_checklist_state = {}
            if payload.primary_platform_key is not None:
                project.primary_platform_key = self._validate_primary_platform(
                    payload.target_platform_keys,
                    payload.primary_platform_key,
                    require_when_multi=True,
                )
            else:
                self._sync_primary_after_platform_change(project)
        elif payload.primary_platform_key is not None:
            project.primary_platform_key = self._validate_primary_platform(
                list(project.target_platforms or []),
                payload.primary_platform_key,
                require_when_multi=True,
            )
        await self.projects.save(project)
        return await self._to_out(project)

    async def delete_project(self, user: User, project_id: uuid.UUID) -> None:
        project = await self._get_owned(user, project_id)
        await self.projects.delete(project)

    async def open_step(
        self,
        user: User,
        project_id: uuid.UUID,
        step_key: str,
    ) -> ProjectOut:
        project = await self._get_owned(user, project_id)
        self._ensure_editable(project)
        self._validate_step(project, step_key)
        if step_key == project.current_step_key:
            return await self._to_out(project)

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
        await self.projects.save(project)
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
        checklist = build_publish_checklist(project.target_platforms)
        checklist_state = project.publish_checklist_state or {}
        pending_items = [
            item
            for item in checklist
            if not checklist_state.get(f"{item['platform']}:{item['item_key']}", False)
        ]
        if pending_items:
            raise AppException(
                "Complete all publish checklist items before finishing the project",
                code=40019,
                status_code=400,
            )

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
            primary_platform_key=project.primary_platform_key,
            draft_content=dict(project.draft_content or {}),
            publish_checklist_state=dict(project.publish_checklist_state or {}),
            created_at=project.created_at,
            updated_at=project.updated_at,
            completed_at=project.completed_at,
            artifacts=artifacts,
            publish_progress=self._publish_progress(project),
        )

    def _publish_progress(self, project: ContentProject) -> PublishProgressOut | None:
        if project.status == "completed" or project.current_step_key != "publish":
            return None
        return summarize_publish_progress(
            list(project.target_platforms or []),
            dict(project.publish_checklist_state or {}),
        )

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
