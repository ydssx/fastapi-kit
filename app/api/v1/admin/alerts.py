from fastapi import APIRouter, Query, Request

from app.api.deps import AdminUser, DbSession, SettingsDep
from app.middleware.client_ip import get_client_ip
from app.middleware.request_id import get_request_id
from app.schemas.admin_alerts import (
    AlertDeliveryPublic,
    AlertSettingsPublic,
    AlertSettingsUpdate,
    AlertTestResult,
)
from app.schemas.common import ApiResponse
from app.schemas.pagination import PaginatedResponse
from app.services.admin_alerts import AdminAlertsService

router = APIRouter(prefix="/alerts", tags=["admin-alerts"])


@router.get("/settings", response_model=ApiResponse[AlertSettingsPublic])
async def get_alert_settings(
    _admin: AdminUser,
    db: DbSession,
    settings: SettingsDep,
) -> ApiResponse[AlertSettingsPublic]:
    data = await AdminAlertsService(db, settings).get_settings()
    return ApiResponse(data=data)


@router.patch("/settings", response_model=ApiResponse[AlertSettingsPublic])
async def update_alert_settings(
    payload: AlertSettingsUpdate,
    admin: AdminUser,
    db: DbSession,
    settings: SettingsDep,
    request: Request,
) -> ApiResponse[AlertSettingsPublic]:
    data = await AdminAlertsService(db, settings).update_settings(
        payload,
        actor_id=admin.id,
        ip=get_client_ip(request, trust_proxy_headers=settings.trust_proxy_headers),
        user_agent=request.headers.get("user-agent"),
        request_id=get_request_id(),
    )
    return ApiResponse(data=data)


@router.get("/deliveries", response_model=ApiResponse[PaginatedResponse[AlertDeliveryPublic]])
async def list_alert_deliveries(
    _admin: AdminUser,
    db: DbSession,
    settings: SettingsDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> ApiResponse[PaginatedResponse[AlertDeliveryPublic]]:
    data = await AdminAlertsService(db, settings).list_deliveries(
        page=page,
        page_size=page_size,
    )
    return ApiResponse(data=data)


@router.post("/test", response_model=ApiResponse[AlertTestResult])
async def test_alert_webhook(
    admin: AdminUser,
    db: DbSession,
    settings: SettingsDep,
    request: Request,
) -> ApiResponse[AlertTestResult]:
    data = await AdminAlertsService(db, settings).send_test(
        actor_id=admin.id,
        ip=get_client_ip(request, trust_proxy_headers=settings.trust_proxy_headers),
        user_agent=request.headers.get("user-agent"),
        request_id=get_request_id(),
    )
    return ApiResponse(data=data)
