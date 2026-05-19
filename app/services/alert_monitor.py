from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.alert_keys import (
    ALERT_DEDUPE_PREFIX,
    ALERT_STATE_BEAT,
    ALERT_STATE_READY,
    ALERT_WORKER_ZERO_SINCE,
)
from app.core.celery_keys import BEAT_HEARTBEAT_REDIS_KEY
from app.core.config import Settings
from app.core.logging import get_logger
from app.models.alert_delivery import AlertDelivery
from app.models.alert_settings import AlertSettings
from app.repositories.alert import AlertDeliveryRepository, AlertSettingsRepository
from app.services.admin_celery import AdminCeleryService
from app.services.admin_dashboard import AdminDashboardService
from app.services.alert_webhook import build_alert_payload, post_webhook

logger = get_logger(__name__)


@dataclass(frozen=True)
class HealthSnapshot:
    database_ok: bool
    redis_ok: bool
    beat_ok: bool
    worker_count: int


class AlertMonitorService:
    def __init__(self, session: AsyncSession, redis: Redis, settings: Settings) -> None:
        self.session = session
        self.redis = redis
        self.settings = settings
        self.settings_repo = AlertSettingsRepository(session)
        self.deliveries_repo = AlertDeliveryRepository(session)

    async def run_check(self) -> None:
        row = await self.settings_repo.get_or_create()
        if not row.webhook_url:
            if self.settings.alert_webhook_url:
                row.webhook_url = self.settings.alert_webhook_url
                row.webhook_secret = row.webhook_secret or self.settings.alert_webhook_secret
            else:
                return

        snapshot = await self._collect_snapshot()
        await self._process_ready(row, snapshot)
        await self._process_beat(row, snapshot)
        if self.settings.alert_worker_zero_enabled:
            await self._process_workers(row, snapshot)

    async def _collect_snapshot(self) -> HealthSnapshot:
        service_status = await AdminDashboardService(
            self.session, self.redis, self.settings
        )._check_services()
        beat_status, _ = await AdminDashboardService(
            self.session, self.redis, self.settings
        )._beat_status()

        try:
            overview = await AdminCeleryService(self.settings).get_overview()
            worker_count = len(overview.workers)
        except Exception:
            worker_count = 0

        return HealthSnapshot(
            database_ok=service_status.database == "ok",
            redis_ok=service_status.redis == "ok",
            beat_ok=beat_status == "ok",
            worker_count=worker_count,
        )

    async def _process_ready(self, settings_row: AlertSettings, snapshot: HealthSnapshot) -> None:
        ready_ok = snapshot.database_ok and snapshot.redis_ok
        previous = await self.redis.get(ALERT_STATE_READY)
        prev_failed = previous == "failed"

        if not ready_ok:
            await self.redis.set(ALERT_STATE_READY, "failed")
            details: dict[str, Any] = {
                "database": "ok" if snapshot.database_ok else "error",
                "redis": "ok" if snapshot.redis_ok else "error",
            }
            await self._maybe_send(
                settings_row,
                event_type="ready_failed",
                details=details,
            )
            return

        await self.redis.set(ALERT_STATE_READY, "ok")
        if prev_failed and settings_row.recovery_notifications_enabled:
            await self._maybe_send(
                settings_row,
                event_type="ready_recovered",
                details={"database": "ok", "redis": "ok"},
                skip_dedupe=True,
            )

    async def _process_beat(self, settings_row: AlertSettings, snapshot: HealthSnapshot) -> None:
        previous = await self.redis.get(ALERT_STATE_BEAT)
        prev_missing = previous == "missing"

        if not snapshot.beat_ok:
            await self.redis.set(ALERT_STATE_BEAT, "missing")
            await self._maybe_send(
                settings_row,
                event_type="beat_missing",
                details={"heartbeat_key": BEAT_HEARTBEAT_REDIS_KEY},
            )
            return

        await self.redis.set(ALERT_STATE_BEAT, "ok")
        if prev_missing and settings_row.recovery_notifications_enabled:
            await self._maybe_send(
                settings_row,
                event_type="beat_recovered",
                details={},
                skip_dedupe=True,
            )

    async def _process_workers(self, settings_row: AlertSettings, snapshot: HealthSnapshot) -> None:
        if snapshot.worker_count > 0:
            await self.redis.delete(ALERT_WORKER_ZERO_SINCE)
            previous = await self.redis.get("alert:state:workers")
            if previous == "missing" and settings_row.recovery_notifications_enabled:
                await self._maybe_send(
                    settings_row,
                    event_type="workers_recovered",
                    details={"worker_count": snapshot.worker_count},
                    skip_dedupe=True,
                )
            await self.redis.set("alert:state:workers", "ok")
            return

        since_raw = await self.redis.get(ALERT_WORKER_ZERO_SINCE)
        if not since_raw:
            await self.redis.set(
                ALERT_WORKER_ZERO_SINCE,
                datetime.now(UTC).isoformat(),
                ex=self.settings.alert_worker_zero_duration_seconds * 2,
            )
            return

        try:
            since_dt = datetime.fromisoformat(since_raw)
            if since_dt.tzinfo is None:
                since_dt = since_dt.replace(tzinfo=UTC)
        except ValueError:
            since_dt = datetime.now(UTC)

        elapsed = (datetime.now(UTC) - since_dt).total_seconds()
        if elapsed < self.settings.alert_worker_zero_duration_seconds:
            return

        await self.redis.set("alert:state:workers", "missing")
        await self._maybe_send(
            settings_row,
            event_type="workers_missing",
            details={"worker_count": 0},
        )

    async def _maybe_send(
        self,
        settings_row: AlertSettings,
        *,
        event_type: str,
        details: dict[str, Any] | None = None,
        skip_dedupe: bool = False,
    ) -> None:
        if not settings_row.webhook_url:
            return

        dedupe_key = f"{ALERT_DEDUPE_PREFIX}{event_type}"
        if not skip_dedupe:
            if await self.redis.get(dedupe_key):
                return

        url = settings_row.webhook_url
        secret = settings_row.webhook_secret
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
        except Exception:
            logger.exception("alert_monitor_delivery_failed", event_type=event_type)
            http_status = None
            success = False

        if not skip_dedupe:
            await self.redis.set(dedupe_key, "1", ex=self.settings.alert_dedupe_seconds)

        await self.deliveries_repo.create(
            AlertDelivery(
                event_type=event_type,
                success=success,
                http_status=http_status,
            )
        )
