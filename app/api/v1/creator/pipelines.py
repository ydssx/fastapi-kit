from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ApiResponse
from app.schemas.creator import PipelineOut
from app.services.creator_project import CreatorProjectService

router = APIRouter()


@router.get("/pipelines", response_model=ApiResponse[list[PipelineOut]])
async def list_pipelines(
    _user: CurrentUser,
    db: DbSession,
) -> ApiResponse[list[PipelineOut]]:
    data = CreatorProjectService(db).list_pipelines()
    return ApiResponse(data=data)
