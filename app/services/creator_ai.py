import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.llm import LlmClient
from app.core.config import Settings, get_settings
from app.core.exceptions import AppException
from app.creator.pipelines import get_pipeline
from app.creator.prompts import build_step_prompt
from app.creator.prompts.multi_variant import (
    build_multi_variant_prompt,
    parse_variants_json,
    uses_multi_variant,
)
from app.models.user import User
from app.repositories.creator_project import CreatorProjectRepository
from app.schemas.creator import AiSuggestOut, AiVariantOut
from app.services.creator_brand import CreatorBrandService
from app.services.creator_project import CreatorProjectService
from app.services.creator_usage import CreatorUsageService


class CreatorAiService:
    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.projects = CreatorProjectRepository(session)
        self.project_service = CreatorProjectService(session)
        self.brand_service = CreatorBrandService(session)
        self.usage = CreatorUsageService(session, self.settings)
        self.llm = LlmClient(self.settings)

    async def suggest(
        self,
        user: User,
        project_id: uuid.UUID,
        step_key: str,
        adjustment: str | None = None,
    ) -> AiSuggestOut:
        project = await self.project_service._get_owned(user, project_id)
        self.project_service._ensure_editable(project)
        if project.current_step_key != step_key:
            raise AppException(
                "AI suggest is only available for the current step",
                code=40020,
                status_code=400,
            )
        pipeline = get_pipeline(project.pipeline_id)
        step = next((s for s in pipeline.steps if s.key == step_key), None)
        if step is None or not step.ai_enabled:
            raise AppException("AI is not enabled for this step", code=40021, status_code=400)

        await self.usage.check_ai_quota(user)
        brand = await self.brand_service.get_profile(user.id)
        context = await self.project_service.gather_confirmed_context(project)

        if uses_multi_variant(step_key):
            system, user_prompt = build_multi_variant_prompt(
                pipeline_id=project.pipeline_id,
                step_key=step_key,
                project_title=project.title,
                brand_tone=brand.tone,
                brand_audience=brand.audience,
                brand_taboos=brand.taboos,
                brand_structure=brand.structure_notes,
                context=context,
                primary_platform_key=project.primary_platform_key,
                adjustment=adjustment,
            )
            raw = await self.llm.complete(system, user_prompt)
            variants = parse_variants_json(raw)
        else:
            system, user_prompt = build_step_prompt(
                pipeline_id=project.pipeline_id,
                step_key=step_key,
                project_title=project.title,
                brand_tone=brand.tone,
                brand_audience=brand.audience,
                brand_taboos=brand.taboos,
                brand_structure=brand.structure_notes,
                context=context,
                primary_platform_key=project.primary_platform_key,
                adjustment=adjustment,
            )
            raw = await self.llm.complete(system, user_prompt)
            variants = [AiVariantOut(label="建议", content=raw)]

        await self.usage.increment_ai(user)
        suggestion = variants[0].content
        return AiSuggestOut(suggestion=suggestion, variants=variants)
