from fastapi import APIRouter

from app.api.deps import AdminUser, DbSession, RedisClient, SettingsDep
from app.schemas.admin import DashboardStats
from app.schemas.common import ApiResponse
from app.services.admin_dashboard import AdminDashboardService

router = APIRouter()


@router.get("/dashboard", response_model=ApiResponse[DashboardStats])
async def dashboard(
    _admin: AdminUser,
    db: DbSession,
    redis: RedisClient,
    settings: SettingsDep,
) -> ApiResponse[DashboardStats]:
    result = await AdminDashboardService(db, redis, settings).get_stats()
    return ApiResponse(data=result)


@router.get("/metrics/summary", response_model=ApiResponse[dict[str, float]])
async def metrics_summary(
    _admin: AdminUser,
    db: DbSession,
    redis: RedisClient,
    settings: SettingsDep,
) -> ApiResponse[dict[str, float]]:
    stats = await AdminDashboardService(db, redis, settings).get_stats()
    return ApiResponse(data=stats.metrics_summary)
