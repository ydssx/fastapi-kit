import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.creator.checklists import build_publish_checklist
from app.creator.pipelines import get_pipeline
from app.models.user import User
from app.repositories.creator_artifact import CreatorArtifactRepository
from app.schemas.creator import ProjectOut, PublishChecklistItemOut, PublishChecklistUpdate
from app.services.creator_events import CreatorEventService
from app.services.creator_project import CreatorProjectService
from app.services.creator_usage import CreatorUsageService


class CreatorPublishService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        projects: CreatorProjectService,
        usage: CreatorUsageService | None = None,
        events: CreatorEventService | None = None,
    ) -> None:
        self.session = session
        self.projects = projects
        self.artifacts = CreatorArtifactRepository(session)
        self.usage = usage or CreatorUsageService(session)
        self.events = events or CreatorEventService(session)

    async def get_publish_checklist(
        self, user: User, project_id: uuid.UUID
    ) -> list[PublishChecklistItemOut]:
        project = await self.projects.get_owned(user, project_id)
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
        project = await self.projects.get_owned(user, project_id)
        self.projects.ensure_editable(project)
        if project.current_step_key != "publish":
            raise AppException(
                "Publish checklist is only available on the publish step",
                code=40014,
                status_code=400,
            )
        state = {key: True for key in payload.checked_keys}
        project.publish_checklist_state = state
        await self.projects.projects.save(project)
        return await self.get_publish_checklist(user, project_id)

    async def complete_project(self, user: User, project_id: uuid.UUID) -> ProjectOut:
        project = await self.projects.get_owned(user, project_id)
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

        artifacts = await self.artifacts.list_for_project(project.id)
        for step in pipeline.steps:
            if step.key == "publish":
                continue
            if not any(a.step_key == step.key for a in artifacts):
                raise AppException(
                    f"Step '{step.title}' must be confirmed before completing",
                    code=40017,
                    status_code=400,
                )

        await self.usage.check_completed_quota(user)
        project.status = "completed"
        project.completed_at = datetime.now(UTC)
        await self.projects.projects.save(project)
        await self.usage.increment_completed(user)
        await self.events.record(
            user_id=user.id,
            event_type="project.completed",
            project_id=project.id,
        )
        return await self.projects.to_out(project)
