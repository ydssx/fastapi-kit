from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.api.v1.creator.deps import CreatorUsageSvc
from app.schemas.common import ApiResponse
from app.schemas.creator import UsageOut

router = APIRouter()


@router.get("/usage", response_model=ApiResponse[UsageOut])
async def get_usage(
    user: CurrentUser,
    usage: CreatorUsageSvc,
) -> ApiResponse[UsageOut]:
    data = await usage.get_usage(user)
    return ApiResponse(data=data)
