import asyncio
from datetime import UTC, datetime

from prometheus_client import REGISTRY
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery_keys import BEAT_HEARTBEAT_REDIS_KEY
from app.core.config import Settings
from app.repositories.user import UserRepository
from app.schemas.admin import DashboardStats, ServiceStatus, SystemOverview
from app.services.migration_status import get_migration_status


class AdminDashboardService:
    def __init__(self, session: AsyncSession, redis: Redis, settings: Settings) -> None:
        self.session = session
        self.redis = redis
        self.settings = settings
        self.users = UserRepository(session)

    async def get_stats(self) -> DashboardStats:
        user_count, active_count, service_status, metrics, system = await asyncio.gather(
            self.users.count_all(),
            self.users.count_active(),
            self._check_services(),
            asyncio.to_thread(self._collect_metrics_summary),
            self._build_system_overview(),
        )
        return DashboardStats(
            user_count=user_count,
            active_user_count=active_count,
            service_status=service_status,
            metrics_summary=metrics,
            system=system,
        )

    async def _check_services(self) -> ServiceStatus:
        db_status = "ok"
        redis_status = "ok"

        try:
            await self.session.execute(text("SELECT 1"))
        except Exception:
            db_status = "error"

        try:
            ping_result = self.redis.ping()
            if hasattr(ping_result, "__await__"):
                ping_ok = await ping_result
            else:
                ping_ok = ping_result
            if ping_ok is not True:
                redis_status = "error"
        except Exception:
            redis_status = "error"

        return ServiceStatus(database=db_status, redis=redis_status)

    async def _build_system_overview(self) -> SystemOverview:
        service_status = await self._check_services()
        at_head, current, head = await get_migration_status(self.session)
        beat_status, beat_last_seen = await self._beat_status()

        if service_status.database == "error" or service_status.redis == "error":
            ready_status = "error"
            ready_message = "One or more dependencies are unavailable"
        elif not at_head:
            ready_status = "degraded"
            ready_message = "Database migration is not at head revision"
        elif beat_status in {"stale", "unknown"}:
            ready_status = "degraded"
            ready_message = "Celery Beat heartbeat is missing or stale"
        else:
            ready_status = "ok"
            ready_message = None

        replicas = self.settings.admin_reported_api_replicas
        replicas_note = None
        if replicas is None:
            replicas_note = "未配置副本数（本机开发可忽略）"

        return SystemOverview(
            ready_status=ready_status,
            ready_message=ready_message,
            migration_at_head=at_head,
            migration_revision=current,
            migration_head_revision=head,
            beat_status=beat_status,
            beat_last_seen=beat_last_seen,
            api_replicas_reported=replicas,
            api_replicas_note=replicas_note,
        )

    async def _beat_status(self) -> tuple[str, datetime | None]:
        try:
            raw = await self.redis.get(BEAT_HEARTBEAT_REDIS_KEY)
        except Exception:
            return "unknown", None

        if not raw:
            return "unknown", None

        text_value = raw.decode() if isinstance(raw, bytes) else str(raw)
        try:
            last_seen = datetime.fromisoformat(text_value)
            if last_seen.tzinfo is None:
                last_seen = last_seen.replace(tzinfo=UTC)
        except ValueError:
            return "unknown", None

        age_seconds = (datetime.now(UTC) - last_seen).total_seconds()
        max_age = self.settings.celery_beat_heartbeat_interval_seconds * 2
        if age_seconds <= max_age:
            return "ok", last_seen
        return "stale", last_seen

    @staticmethod
    def _collect_metrics_summary() -> dict[str, float]:
        summary: dict[str, float] = {}
        for metric in REGISTRY.collect():
            for sample in metric.samples:
                name = sample.name
                if name.endswith("_total") or name.endswith("_created"):
                    if isinstance(sample.value, (int, float)):
                        summary[name] = float(sample.value)
        return dict(sorted(summary.items())[:50])
