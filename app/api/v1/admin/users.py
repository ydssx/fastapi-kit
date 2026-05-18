import uuid

from fastapi import APIRouter, Query, Request

from app.api.deps import AdminUser, DbSession, SettingsDep
from app.middleware.client_ip import get_client_ip
from app.schemas.admin import AuditLogPublic, PasswordResetResult, UserAdmin, UserUpdate
from app.schemas.common import ApiResponse
from app.schemas.pagination import PaginatedResponse
from app.services.admin_users import AdminUserService

router = APIRouter()


@router.get("/users", response_model=ApiResponse[PaginatedResponse[UserAdmin]])
async def list_users(
    _admin: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    email: str | None = None,
    is_active: bool | None = None,
    role: str | None = None,
) -> ApiResponse[PaginatedResponse[UserAdmin]]:
    result = await AdminUserService(db).list_users(
        page=page,
        page_size=page_size,
        email=email,
        is_active=is_active,
        role=role,
    )
    return ApiResponse(data=result)


@router.get("/users/{user_id}", response_model=ApiResponse[UserAdmin])
async def get_user(
    user_id: uuid.UUID,
    _admin: AdminUser,
    db: DbSession,
) -> ApiResponse[UserAdmin]:
    result = await AdminUserService(db).get_user(user_id)
    return ApiResponse(data=result)


@router.patch("/users/{user_id}", response_model=ApiResponse[UserAdmin])
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    admin: AdminUser,
    db: DbSession,
    request: Request,
    settings: SettingsDep,
) -> ApiResponse[UserAdmin]:
    client_ip = get_client_ip(request, trust_proxy_headers=settings.trust_proxy_headers)
    user_agent = request.headers.get("user-agent")
    result = await AdminUserService(db).update_user(
        admin,
        user_id,
        payload,
        ip=client_ip,
        user_agent=user_agent,
    )
    return ApiResponse(data=result)


@router.get(
    "/users/{user_id}/audit-logs",
    response_model=ApiResponse[list[AuditLogPublic]],
)
async def list_user_audit_logs(
    user_id: uuid.UUID,
    _admin: AdminUser,
    db: DbSession,
    limit: int = Query(20, ge=1, le=100),
) -> ApiResponse[list[AuditLogPublic]]:
    items = await AdminUserService(db).list_user_audit_logs(user_id, limit=limit)
    return ApiResponse(data=items)


@router.post(
    "/users/{user_id}/reset-password",
    response_model=ApiResponse[PasswordResetResult],
)
async def reset_user_password(
    user_id: uuid.UUID,
    admin: AdminUser,
    db: DbSession,
    request: Request,
    settings: SettingsDep,
) -> ApiResponse[PasswordResetResult]:
    client_ip = get_client_ip(request, trust_proxy_headers=settings.trust_proxy_headers)
    user_agent = request.headers.get("user-agent")
    result = await AdminUserService(db).reset_password(
        admin,
        user_id,
        ip=client_ip,
        user_agent=user_agent,
    )
    return ApiResponse(data=result)
