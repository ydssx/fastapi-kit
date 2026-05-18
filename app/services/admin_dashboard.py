import asyncio

from prometheus_client import REGISTRY
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user import UserRepository
from app.schemas.admin import DashboardStats, ServiceStatus


class AdminDashboardService:
    def __init__(self, session: AsyncSession, redis: Redis) -> None:
        self.session = session
        self.redis = redis
        self.users = UserRepository(session)

    async def get_stats(self) -> DashboardStats:
        user_count, active_count, service_status, metrics = await asyncio.gather(
            self.users.count_all(),
            self.users.count_active(),
            self._check_services(),
            asyncio.to_thread(self._collect_metrics_summary),
        )
        return DashboardStats(
            user_count=user_count,
            active_user_count=active_count,
            service_status=service_status,
            metrics_summary=metrics,
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
