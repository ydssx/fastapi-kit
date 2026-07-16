from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import AdminUser, DbSession
from app.api.v1.admin.deps import get_creator_events_for_admin
from app.schemas.common import ApiResponse
from app.schemas.creator import CreatorMetricsSummary
from app.services.creator_events import CreatorEventService

router = APIRouter()


@router.get("/creator-metrics/summary", response_model=ApiResponse[CreatorMetricsSummary])
async def creator_metrics_summary(
    _admin: AdminUser,
    _db: DbSession,
    events: Annotated[CreatorEventService, Depends(get_creator_events_for_admin)],
) -> ApiResponse[CreatorMetricsSummary]:
    data = await events.metrics_summary()
    return ApiResponse(data=data)
