from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.llm import LlmClient
from app.core.config import Settings, get_settings
from app.core.exceptions import AppException
from app.creator.pipelines import get_pipeline
from app.creator.prompts.playground import (
    build_refine_prompt,
    build_topics_prompt,
    extract_understanding,
    parse_topics_json,
)
from app.models.user import User
from app.schemas.creator import (
    PlaygroundHandoffIn,
    PlaygroundHandoffOut,
    PlaygroundRefineIn,
    PlaygroundRefineOut,
    PlaygroundTopicsOut,
    ProjectCreate,
)
from app.services.creator_brand import CreatorBrandService
from app.services.creator_events import CreatorEventService
from app.services.creator_project import CreatorProjectService
from app.services.creator_usage import CreatorUsageService


def _brand_is_empty(
    brand_tone: str,
    brand_audience: str,
    brand_taboos: str,
    brand_structure: str,
) -> bool:
    return not any(
        [
            brand_tone.strip(),
            brand_audience.strip(),
            brand_taboos.strip(),
            brand_structure.strip(),
        ]
    )


def _build_topic_draft(title: str, brief: str, raw_notes: str | None) -> str:
    parts = [f"# {title.strip()}", "", brief.strip()]
    if raw_notes and raw_notes.strip():
        parts.extend(["", "---", raw_notes.strip()])
    return "\n".join(parts)


class CreatorPlaygroundService:
    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.brand_service = CreatorBrandService(session)
        self.usage = CreatorUsageService(session, self.settings)
        self.project_service = CreatorProjectService(session)
        self.events = CreatorEventService(session)
        self.llm = LlmClient(self.settings)

    async def generate_topics(self, user: User, seed: str | None = None) -> PlaygroundTopicsOut:
        await self.usage.check_playground_quota(user)
        brand = await self.brand_service.get_profile(user.id)
        brand_empty = _brand_is_empty(
            brand.tone, brand.audience, brand.taboos, brand.structure_notes
        )
        system, user_prompt = build_topics_prompt(brand, seed)
        try:
            raw = await self.llm.complete(system, user_prompt)
            topics = parse_topics_json(raw)
        except AppException:
            raise
        except ValueError as exc:
            raise AppException(
                "Failed to parse topic suggestions. Please retry.",
                code=50304,
                status_code=503,
            ) from exc

        await self.usage.increment_playground(user)
        await self.events.record(
            user_id=user.id,
            event_type="playground.topics_generated",
            payload={"count": len(topics)},
        )
        return PlaygroundTopicsOut(topics=topics, brand_empty=brand_empty)

    async def refine(self, user: User, payload: PlaygroundRefineIn) -> PlaygroundRefineOut:
        await self.usage.check_playground_quota(user)
        brand = await self.brand_service.get_profile(user.id)
        system, user_prompt = build_refine_prompt(
            brand, payload.selected_topic, payload.messages
        )
        raw = await self.llm.complete(system, user_prompt)
        reply, understanding = extract_understanding(raw)
        await self.usage.increment_playground(user)
        return PlaygroundRefineOut(reply=reply, understanding=understanding)

    async def handoff_to_project(
        self, user: User, payload: PlaygroundHandoffIn
    ) -> PlaygroundHandoffOut:
        try:
            pipeline = get_pipeline(payload.pipeline_id)
        except KeyError as exc:
            raise AppException("Unknown pipeline", code=40010, status_code=400) from exc

        project_out = await self.project_service.create_project(
            user,
            ProjectCreate(
                pipeline_id=payload.pipeline_id,
                title=payload.title.strip(),
                target_platform_keys=[],
            ),
        )
        project = await self.project_service._get_owned(user, project_out.id)
        drafts = {**dict(project.draft_content)}
        drafts["topic"] = _build_topic_draft(payload.title, payload.brief, payload.raw_notes)

        step_keys = {step.key for step in pipeline.steps}
        if payload.hooks and payload.hooks.strip():
            if "hook" in step_keys:
                drafts["hook"] = payload.hooks.strip()
            elif "outline" in step_keys:
                drafts["outline"] = payload.hooks.strip()

        project.draft_content = drafts
        await self.project_service.projects.save(project)

        await self.events.record(
            user_id=user.id,
            event_type="playground.handoff",
            project_id=project.id,
            payload={"pipeline_id": payload.pipeline_id},
        )
        return PlaygroundHandoffOut(project_id=project.id)
