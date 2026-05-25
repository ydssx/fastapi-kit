from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ApiResponse
from app.schemas.creator import UsageOut
from app.services.creator_usage import CreatorUsageService

router = APIRouter()


@router.get("/usage", response_model=ApiResponse[UsageOut])
async def get_usage(
    user: CurrentUser,
    db: DbSession,
) -> ApiResponse[UsageOut]:
    data = await CreatorUsageService(db).get_usage(user)
    return ApiResponse(data=data)
