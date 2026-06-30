from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ApiResponse
from app.schemas.creator import (
    PlaygroundHandoffIn,
    PlaygroundHandoffOut,
    PlaygroundOutlineGenerateIn,
    PlaygroundOutlineGenerateOut,
    PlaygroundOutlineRefineIn,
    PlaygroundOutlineRefineOut,
    PlaygroundRefineIn,
    PlaygroundRefineOut,
    PlaygroundTopicsIn,
    PlaygroundTopicsOut,
)
from app.services.creator_playground import CreatorPlaygroundService

router = APIRouter()


@router.post("/playground/topics", response_model=ApiResponse[PlaygroundTopicsOut])
async def playground_topics(
    user: CurrentUser,
    db: DbSession,
    body: PlaygroundTopicsIn | None = None,
) -> ApiResponse[PlaygroundTopicsOut]:
    seed = body.seed if body is not None else None
    data = await CreatorPlaygroundService(db).generate_topics(user, seed)
    return ApiResponse(data=data)


@router.post("/playground/refine", response_model=ApiResponse[PlaygroundRefineOut])
async def playground_refine(
    user: CurrentUser,
    db: DbSession,
    body: PlaygroundRefineIn,
) -> ApiResponse[PlaygroundRefineOut]:
    data = await CreatorPlaygroundService(db).refine(user, body)
    return ApiResponse(data=data)


@router.post("/playground/outline", response_model=ApiResponse[PlaygroundOutlineGenerateOut])
async def playground_outline_generate(
    user: CurrentUser,
    db: DbSession,
    body: PlaygroundOutlineGenerateIn,
) -> ApiResponse[PlaygroundOutlineGenerateOut]:
    data = await CreatorPlaygroundService(db).generate_outline(user, body.selected_topic)
    return ApiResponse(data=data)


@router.post(
    "/playground/outline/refine",
    response_model=ApiResponse[PlaygroundOutlineRefineOut],
)
async def playground_outline_refine(
    user: CurrentUser,
    db: DbSession,
    body: PlaygroundOutlineRefineIn,
) -> ApiResponse[PlaygroundOutlineRefineOut]:
    data = await CreatorPlaygroundService(db).refine_outline(user, body)
    return ApiResponse(data=data)


@router.post("/playground/handoff", response_model=ApiResponse[PlaygroundHandoffOut])
async def playground_handoff(
    user: CurrentUser,
    db: DbSession,
    body: PlaygroundHandoffIn,
) -> ApiResponse[PlaygroundHandoffOut]:
    data = await CreatorPlaygroundService(db).handoff_to_project(user, body)
    return ApiResponse(data=data)
