from typing import Annotated

from fastapi import Depends

from app.api.deps import DbSession, SettingsDep
from app.services.creator_ai import CreatorAiService
from app.services.creator_brand import CreatorBrandService
from app.services.creator_events import CreatorEventService
from app.services.creator_image_generation import CreatorImageGenerationService
from app.services.creator_media import CreatorMediaService
from app.services.creator_pipeline import CreatorPipelineService
from app.services.creator_playground import CreatorPlaygroundService
from app.services.creator_project import CreatorProjectService
from app.services.creator_publish import CreatorPublishService
from app.services.creator_step import CreatorStepService
from app.services.creator_usage import CreatorUsageService


def get_creator_events(db: DbSession) -> CreatorEventService:
    return CreatorEventService(db)


def get_creator_usage(db: DbSession, settings: SettingsDep) -> CreatorUsageService:
    return CreatorUsageService(db, settings)


def get_creator_brand(db: DbSession) -> CreatorBrandService:
    return CreatorBrandService(db)


def get_creator_project(
    db: DbSession,
    events: Annotated[CreatorEventService, Depends(get_creator_events)],
) -> CreatorProjectService:
    return CreatorProjectService(db, events=events)


def get_creator_step(
    db: DbSession,
    projects: Annotated[CreatorProjectService, Depends(get_creator_project)],
) -> CreatorStepService:
    return CreatorStepService(db, projects=projects)


def get_creator_publish(
    db: DbSession,
    projects: Annotated[CreatorProjectService, Depends(get_creator_project)],
    usage: Annotated[CreatorUsageService, Depends(get_creator_usage)],
    events: Annotated[CreatorEventService, Depends(get_creator_events)],
) -> CreatorPublishService:
    return CreatorPublishService(db, projects=projects, usage=usage, events=events)


def get_creator_pipeline() -> CreatorPipelineService:
    return CreatorPipelineService()


def get_creator_ai(
    db: DbSession,
    settings: SettingsDep,
    projects: Annotated[CreatorProjectService, Depends(get_creator_project)],
    steps: Annotated[CreatorStepService, Depends(get_creator_step)],
    brand: Annotated[CreatorBrandService, Depends(get_creator_brand)],
    usage: Annotated[CreatorUsageService, Depends(get_creator_usage)],
) -> CreatorAiService:
    return CreatorAiService(
        db,
        settings=settings,
        projects=projects,
        steps=steps,
        brand=brand,
        usage=usage,
    )


def get_creator_playground(
    db: DbSession,
    settings: SettingsDep,
    brand: Annotated[CreatorBrandService, Depends(get_creator_brand)],
    usage: Annotated[CreatorUsageService, Depends(get_creator_usage)],
    projects: Annotated[CreatorProjectService, Depends(get_creator_project)],
    events: Annotated[CreatorEventService, Depends(get_creator_events)],
) -> CreatorPlaygroundService:
    return CreatorPlaygroundService(
        db,
        settings=settings,
        brand=brand,
        usage=usage,
        projects=projects,
        events=events,
    )


def get_creator_media(db: DbSession, settings: SettingsDep) -> CreatorMediaService:
    return CreatorMediaService(db, settings)


def get_creator_image_generation(
    db: DbSession, settings: SettingsDep
) -> CreatorImageGenerationService:
    return CreatorImageGenerationService(db, settings)


CreatorEventsSvc = Annotated[CreatorEventService, Depends(get_creator_events)]
CreatorUsageSvc = Annotated[CreatorUsageService, Depends(get_creator_usage)]
CreatorBrandSvc = Annotated[CreatorBrandService, Depends(get_creator_brand)]
CreatorProjectSvc = Annotated[CreatorProjectService, Depends(get_creator_project)]
CreatorStepSvc = Annotated[CreatorStepService, Depends(get_creator_step)]
CreatorPublishSvc = Annotated[CreatorPublishService, Depends(get_creator_publish)]
CreatorPipelineSvc = Annotated[CreatorPipelineService, Depends(get_creator_pipeline)]
CreatorAiSvc = Annotated[CreatorAiService, Depends(get_creator_ai)]
CreatorPlaygroundSvc = Annotated[CreatorPlaygroundService, Depends(get_creator_playground)]
CreatorMediaSvc = Annotated[CreatorMediaService, Depends(get_creator_media)]
CreatorImageGenerationSvc = Annotated[
    CreatorImageGenerationService, Depends(get_creator_image_generation)
]
