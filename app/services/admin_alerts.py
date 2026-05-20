import uuid
from typing import Any

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.models.alert_delivery import AlertDelivery
from app.models.alert_settings import AlertSettings
from app.repositories.alert import AlertDeliveryRepository, AlertSettingsRepository
from app.schemas.admin_alerts import (
    AlertDeliveryPublic,
    AlertSettingsPublic,
    AlertSettingsUpdate,
    AlertTestResult,
)
from app.schemas.pagination import PaginatedResponse
from app.services.alert_webhook import build_alert_payload, post_webhook, validate_webhook_url
from app.services.audit import AuditService

logger = get_logger(__name__)


class AdminAlertsService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.settings_repo = AlertSettingsRepository(session)
        self.deliveries_repo = AlertDeliveryRepository(session)

    async def get_settings(self) -> AlertSettingsPublic:
        row = await self._ensure_settings_row()
        return self._to_public(row)

    async def update_settings(
        self,
        payload: AlertSettingsUpdate,
        *,
        actor_id: uuid.UUID,
        ip: str | None,
        user_agent: str | None,
        request_id: str | None = None,
    ) -> AlertSettingsPublic:
        row = await self._ensure_settings_row()

        if payload.webhook_url is not None:
            url_str = payload.webhook_url.strip()
            if url_str:
                validate_webhook_url(url_str)
                row.webhook_url = url_str
            else:
                row.webhook_url = None

        if payload.clear_webhook_secret:
            row.webhook_secret = None
        elif payload.webhook_secret is not None:
            row.webhook_secret = payload.webhook_secret or None

        if payload.recovery_notifications_enabled is not None:
            row.recovery_notifications_enabled = payload.recovery_notifications_enabled

        await self.settings_repo.update(row)
        await AuditService(self.session).record(
            actor_id=actor_id,
            action="alert.settings_update",
            resource_type="alert_settings",
            resource_id=str(row.id),
            detail={
                "webhook_enabled": bool(row.webhook_url),
                "recovery_notifications_enabled": row.recovery_notifications_enabled,
            },
            ip=ip,
            user_agent=user_agent,
            request_id=request_id,
        )
        return self._to_public(row)

    async def list_deliveries(
        self,
        *,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[AlertDeliveryPublic]:
        items, total = await self.deliveries_repo.list_paginated(
            page=page,
            page_size=page_size,
        )
        return PaginatedResponse(
            items=[AlertDeliveryPublic.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def send_test(
        self,
        *,
        actor_id: uuid.UUID,
        ip: str | None,
        user_agent: str | None,
        request_id: str | None = None,
    ) -> AlertTestResult:
        row = await self._ensure_settings_row()
        if not row.webhook_url:
            raise AppException(
                "Alert webhook URL is not configured",
                code=40006,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        http_status, success = await self._deliver(
            row.webhook_url,
            row.webhook_secret,
            event_type="test",
            details={"triggered_by": str(actor_id)},
        )
        await self.deliveries_repo.create(
            AlertDelivery(
                event_type="test",
                success=success,
                http_status=http_status,
            )
        )
        await AuditService(self.session).record(
            actor_id=actor_id,
            action="alert.test_send",
            resource_type="alert_settings",
            resource_id=str(row.id),
            detail={"success": success, "http_status": http_status},
            ip=ip,
            user_agent=user_agent,
            request_id=request_id,
        )
        message = "Test alert sent" if success else "Test alert delivery failed"
        return AlertTestResult(sent=success, http_status=http_status, message=message)

    async def _ensure_settings_row(self) -> AlertSettings:
        row = await self.settings_repo.get_or_create()
        if not row.webhook_url and self.settings.alert_webhook_url:
            row.webhook_url = self.settings.alert_webhook_url
        if not row.webhook_secret and self.settings.alert_webhook_secret:
            row.webhook_secret = self.settings.alert_webhook_secret
        return row

    async def _deliver(
        self,
        url: str,
        secret: str | None,
        *,
        event_type: str,
        details: dict[str, Any] | None = None,
    ) -> tuple[int | None, bool]:
        payload = build_alert_payload(
            event_type=event_type,
            settings=self.settings,
            details=details,
        )
        try:
            http_status = await post_webhook(
                url=url,
                payload=payload,
                secret=secret,
                timeout=self.settings.alert_webhook_timeout_seconds,
            )
            success = http_status is not None and 200 <= http_status < 300
            return http_status, success
        except Exception:
            logger.exception("alert_webhook_delivery_failed", event_type=event_type)
            return None, False

    @staticmethod
    def _to_public(row: AlertSettings) -> AlertSettingsPublic:
        return AlertSettingsPublic(
            webhook_url=row.webhook_url,
            webhook_secret_configured=bool(row.webhook_secret),
            recovery_notifications_enabled=row.recovery_notifications_enabled,
            webhook_enabled=bool(row.webhook_url),
        )
