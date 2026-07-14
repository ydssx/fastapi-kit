from fastapi import APIRouter

from app.api.deps import AdminUser, DbSession
from app.schemas.common import ApiResponse
from app.schemas.creator import CreatorMetricsSummary
from app.services.creator_events import CreatorEventService

router = APIRouter()


@router.get("/creator-metrics/summary", response_model=ApiResponse[CreatorMetricsSummary])
async def creator_metrics_summary(
    _admin: AdminUser,
    db: DbSession,
) -> ApiResponse[CreatorMetricsSummary]:
    data = await CreatorEventService(db).metrics_summary()
    return ApiResponse(data=data)
