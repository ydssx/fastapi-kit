from datetime import datetime

from fastapi import APIRouter, Query

from app.api.deps import AdminUser, SettingsDep
from app.schemas.admin_logs import LogQueryResult
from app.schemas.common import ApiResponse
from app.services.admin_logs import AdminLogsService

router = APIRouter()


@router.get("/logs", response_model=ApiResponse[LogQueryResult])
async def query_logs(
    _admin: AdminUser,
    settings: SettingsDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    since: datetime | None = None,
    until: datetime | None = None,
    request_id: str | None = None,
    level: str | None = None,
    q: str | None = None,
) -> ApiResponse[LogQueryResult]:
    data = await AdminLogsService(settings).query_logs(
        since=since,
        until=until,
        request_id=request_id,
        level=level,
        q=q,
        page=page,
        page_size=page_size,
    )
    return ApiResponse(data=data)
