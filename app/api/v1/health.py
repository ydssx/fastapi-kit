from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_redis
from app.db.session import get_db
from app.schemas.common import ApiResponse, HealthData, ReadyData

router = APIRouter(tags=["health"])


@router.get("/health", response_model=ApiResponse[HealthData])
async def health() -> ApiResponse[HealthData]:
    return ApiResponse(data=HealthData(status="ok"))


@router.get("/ready", response_model=ApiResponse[ReadyData])
async def ready(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> ApiResponse[ReadyData] | JSONResponse:
    db_status = "ok"
    redis_status = "ok"

    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    try:
        ping_result = redis.ping()
        if hasattr(ping_result, "__await__"):
            ping_ok = await ping_result
        else:
            ping_ok = ping_result
        if ping_ok is not True:
            redis_status = "error"
    except Exception:
        redis_status = "error"

    data = ReadyData(status="ok", database=db_status, redis=redis_status)
    if db_status != "ok" or redis_status != "ok":
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ApiResponse(
                code=50300,
                message="Service not ready",
                data=data,
            ).model_dump(),
        )
    return ApiResponse(data=data)
