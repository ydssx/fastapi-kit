from fastapi import APIRouter

from app.api.v1.creator import ai, brand, media, pipelines, playground, projects, usage

creator_router = APIRouter()
creator_router.include_router(pipelines.router)
creator_router.include_router(projects.router)
creator_router.include_router(brand.router)
creator_router.include_router(usage.router)
creator_router.include_router(ai.router)
creator_router.include_router(playground.router)
creator_router.include_router(media.router)
