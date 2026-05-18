import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Literal

from app.core.config import Settings, get_settings
from app.schemas.admin import CeleryOverview, CeleryTaskInfo, CeleryWorkerInfo
from app.tasks.celery_app import celery_app

InspectMethod = Literal["stats", "active", "scheduled", "reserved"]


def _normalize_worker_map(raw: object) -> dict[str, Any]:
    """Celery control commands may return a dict or a list of single-key dicts."""
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, list):
        merged: dict[str, Any] = {}
        for item in raw:
            if isinstance(item, dict):
                merged.update(item)
        return merged
    return {}


def _inspect_broadcast(method: InspectMethod, timeout: float) -> dict[str, Any]:
    inspector = celery_app.control.inspect(timeout=timeout)
    if inspector is None:
        return {}
    result = getattr(inspector, method)()
    return result if isinstance(result, dict) else {}


class AdminCeleryService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def get_overview(self) -> CeleryOverview:
        overall_timeout = self.settings.celery_inspect_overall_timeout
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(self._inspect_sync),
                timeout=overall_timeout,
            )
        except TimeoutError:
            return CeleryOverview(
                status="degraded",
                workers=[],
                active_tasks=[],
                scheduled_tasks=[],
                message=(
                    f"Celery inspect timed out after {overall_timeout}s; "
                    "check that celery-worker is running"
                ),
            )
        except Exception as exc:
            return CeleryOverview(
                status="degraded",
                workers=[],
                active_tasks=[],
                scheduled_tasks=[],
                message=str(exc),
            )

    def _inspect_sync(self) -> CeleryOverview:
        timeout = self.settings.celery_inspect_timeout

        ping = _normalize_worker_map(celery_app.control.ping(timeout=timeout))
        if not ping:
            return CeleryOverview(
                status="unavailable",
                workers=[],
                active_tasks=[],
                scheduled_tasks=[],
                message="No Celery workers responded to ping; start celery-worker",
            )

        with ThreadPoolExecutor(max_workers=3) as executor:
            fut_stats = executor.submit(_inspect_broadcast, "stats", timeout)
            fut_active = executor.submit(_inspect_broadcast, "active", timeout)
            fut_scheduled = executor.submit(_inspect_broadcast, "scheduled", timeout)
            stats = _normalize_worker_map(fut_stats.result())
            active = _normalize_worker_map(fut_active.result())
            scheduled = _normalize_worker_map(fut_scheduled.result())

        worker_names = (
            set(ping.keys()) | set(stats.keys()) | set(active.keys()) | set(scheduled.keys())
        )

        workers: list[CeleryWorkerInfo] = []
        for name in sorted(worker_names):
            worker_stats = stats.get(name) if isinstance(stats.get(name), dict) else {}
            processed = None
            total = worker_stats.get("total") if isinstance(worker_stats, dict) else None
            if isinstance(total, dict):
                processed = sum(int(v) for v in total.values() if isinstance(v, (int, float)))
            workers.append(
                CeleryWorkerInfo(
                    name=name,
                    status="online" if name in ping else "unknown",
                    active_tasks=len(active.get(name, [])),
                    processed=processed,
                )
            )

        active_tasks = self._parse_tasks(active, scheduled=False)
        scheduled_tasks = self._parse_tasks(scheduled, scheduled=True)

        return CeleryOverview(
            status="ok",
            workers=workers,
            active_tasks=active_tasks,
            scheduled_tasks=scheduled_tasks,
        )

    @staticmethod
    def _parse_tasks(
        task_map: dict[str, list[dict[str, Any]]],
        *,
        scheduled: bool,
    ) -> list[CeleryTaskInfo]:
        tasks: list[CeleryTaskInfo] = []
        for worker, entries in task_map.items():
            for entry in entries:
                if scheduled:
                    request = entry.get("request", entry)
                else:
                    request = entry
                tasks.append(
                    CeleryTaskInfo(
                        worker=worker,
                        task_id=str(request.get("id", "")),
                        name=str(request.get("name", "unknown")),
                        args=list(request.get("args") or []),
                    )
                )
        return tasks
