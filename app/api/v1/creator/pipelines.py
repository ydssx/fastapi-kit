from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.api.v1.creator.deps import CreatorPipelineSvc
from app.schemas.common import ApiResponse
from app.schemas.creator import PipelineOut

router = APIRouter()


@router.get("/pipelines", response_model=ApiResponse[list[PipelineOut]])
async def list_pipelines(
    _user: CurrentUser,
    pipelines: CreatorPipelineSvc,
) -> ApiResponse[list[PipelineOut]]:
    return ApiResponse(data=pipelines.list_pipelines())
