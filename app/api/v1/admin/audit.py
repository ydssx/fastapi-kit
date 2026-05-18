import uuid
from datetime import datetime

from fastapi import APIRouter, Query

from app.api.deps import AdminUser, DbSession
from app.repositories.audit_log import AuditLogRepository
from app.schemas.admin import AuditLogPublic
from app.schemas.common import ApiResponse
from app.schemas.pagination import PaginatedResponse

router = APIRouter()


@router.get("/audit-logs", response_model=ApiResponse[PaginatedResponse[AuditLogPublic]])
async def list_audit_logs(
    _admin: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: str | None = None,
    actor_id: uuid.UUID | None = None,
    resource_type: str | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
) -> ApiResponse[PaginatedResponse[AuditLogPublic]]:
    items, total = await AuditLogRepository(db).list_paginated(
        page=page,
        page_size=page_size,
        action=action,
        actor_id=actor_id,
        resource_type=resource_type,
        since=since,
        until=until,
    )
    return ApiResponse(
        data=PaginatedResponse(
            items=[AuditLogPublic.model_validate(log) for log in items],
            total=total,
            page=page,
            page_size=page_size,
        )
    )
