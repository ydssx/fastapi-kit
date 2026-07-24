import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.creator.checklists import summarize_publish_progress
from app.creator.pipelines import first_step_key, get_pipeline
from app.models.creator import ContentProject
from app.models.user import User
from app.repositories.creator_artifact import CreatorArtifactRepository
from app.repositories.creator_project import CreatorProjectRepository
from app.schemas.creator import (
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    PublishProgressOut,
    StepArtifactOut,
)
from app.services.creator_events import CreatorEventService


class CreatorProjectService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        events: CreatorEventService | None = None,
    ) -> None:
        self.session = session
        self.projects = CreatorProjectRepository(session)
        self.artifacts = CreatorArtifactRepository(session)
        self.events = events or CreatorEventService(session)

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
        return await self.to_out(created)

    async def list_projects(self, user: User) -> list[ProjectOut]:
        rows = await self.projects.list_for_user(user.id)
        return [await self.to_out(row, include_artifacts=False) for row in rows]

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
        project = await self.get_owned(user, project_id)
        return await self.to_out(project)

    async def update_project(
        self,
        user: User,
        project_id: uuid.UUID,
        payload: ProjectUpdate,
    ) -> ProjectOut:
        project = await self.get_owned(user, project_id)
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
        return await self.to_out(project)

    async def delete_project(self, user: User, project_id: uuid.UUID) -> None:
        project = await self.get_owned(user, project_id)
        await self.projects.delete(project)

    async def get_owned(self, user: User, project_id: uuid.UUID) -> ContentProject:
        project = await self.projects.get_by_id_for_user(project_id, user.id)
        if project is None:
            raise AppException("Project not found", code=40402, status_code=404)
        return project

    def ensure_editable(self, project: ContentProject) -> None:
        if project.status == "completed":
            raise AppException("Project is read-only", code=40018, status_code=400)

    async def to_out(
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

    @staticmethod
    def _publish_progress(project: ContentProject) -> PublishProgressOut | None:
        if project.status == "completed" or project.current_step_key != "publish":
            return None
        return summarize_publish_progress(
            list(project.target_platforms or []),
            dict(project.publish_checklist_state or {}),
        )
