from fastapi import APIRouter

from app.api.deps import AdminUser
from app.schemas.admin import CeleryOverview
from app.schemas.common import ApiResponse
from app.services.admin_celery import AdminCeleryService

router = APIRouter()


@router.get("/celery/overview", response_model=ApiResponse[CeleryOverview])
async def celery_overview(_admin: AdminUser) -> ApiResponse[CeleryOverview]:
    result = await AdminCeleryService().get_overview()
    return ApiResponse(data=result)
