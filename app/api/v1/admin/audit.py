import uuid
from collections.abc import AsyncIterator
from datetime import datetime

from fastapi import APIRouter, Query
from starlette.responses import StreamingResponse

from app.api.deps import AdminUser, DbSession, SettingsDep
from app.repositories.audit_log import AuditLogRepository
from app.schemas.admin import AuditLogPublic
from app.schemas.common import ApiResponse
from app.schemas.pagination import PaginatedResponse
from app.services.admin_audit import AdminAuditService

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


@router.get("/audit-logs/export")
async def export_audit_logs(
    _admin: AdminUser,
    db: DbSession,
    settings: SettingsDep,
    action: str | None = None,
    actor_id: uuid.UUID | None = None,
    resource_type: str | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
) -> StreamingResponse:
    service = AdminAuditService(db, settings)

    async def stream() -> AsyncIterator[str]:
        async for chunk in service.iter_export_rows(
            action=action,
            actor_id=actor_id,
            resource_type=resource_type,
            since=since,
            until=until,
        ):
            yield chunk

    return StreamingResponse(
        stream(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="audit-logs.csv"'},
    )
