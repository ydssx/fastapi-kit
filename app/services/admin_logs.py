import json
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urljoin

import httpx
from fastapi import status

from app.core.config import Settings
from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.schemas.admin_logs import LogEntryPublic, LogQueryResult

logger = get_logger(__name__)

LOKI_UNAVAILABLE_CODE = 50301


class AdminLogsService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def _require_loki(self) -> str:
        base = self.settings.loki_url
        if not base:
            raise AppException(
                "Log aggregation is not configured. Start the ops profile with Loki (see README).",
                code=LOKI_UNAVAILABLE_CODE,
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return base.rstrip("/")

    async def query_logs(
        self,
        *,
        since: datetime | None,
        until: datetime | None,
        request_id: str | None,
        level: str | None,
        q: str | None,
        page: int,
        page_size: int,
    ) -> LogQueryResult:
        base = self._require_loki()
        end = until or datetime.now(UTC)
        start = since or datetime.fromtimestamp(end.timestamp() - 3600, tz=UTC)

        logql = self._build_logql(request_id=request_id, level=level, q=q)
        limit = min(page_size, self.settings.loki_max_lines)
        params: dict[str, str | int] = {
            "query": logql,
            "start": int(start.timestamp() * 1e9),
            "end": int(end.timestamp() * 1e9),
            "limit": limit,
            "direction": "backward",
        }

        url = urljoin(f"{base}/", "loki/api/v1/query_range")
        try:
            async with httpx.AsyncClient(
                timeout=self.settings.loki_query_timeout_seconds
            ) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPError as exc:
            logger.warning("loki_query_failed", error=str(exc))
            raise AppException(
                "Failed to query Loki. Ensure the ops profile is running and LOKI_URL is correct.",
                code=LOKI_UNAVAILABLE_CODE,
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            ) from exc

        entries = self._parse_loki_response(payload)
        total = len(entries)
        offset = (page - 1) * page_size
        page_items = entries[offset : offset + page_size]
        return LogQueryResult(
            items=page_items,
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def _build_logql(
        *,
        request_id: str | None,
        level: str | None,
        q: str | None,
    ) -> str:
        query = '{job="fastapi"}'
        if request_id:
            safe_id = request_id.replace('"', '\\"')
            query += f' |= "{safe_id}"'
        if level:
            safe_level = level.replace('"', '\\"')
            query += f' |= "{safe_level}"'
        if q:
            safe_q = q.replace('"', '\\"')
            query += f' |= "{safe_q}"'
        return query

    def _parse_loki_response(self, payload: dict[str, Any]) -> list[LogEntryPublic]:
        results = payload.get("data", {}).get("result", [])
        entries: list[LogEntryPublic] = []
        for stream in results:
            for ts_ns, line in stream.get("values", []):
                entry = self._parse_log_line(ts_ns, line)
                if entry is not None:
                    entries.append(entry)
        entries.sort(key=lambda item: item.timestamp, reverse=True)
        cap = self.settings.loki_max_lines
        return entries[:cap]

    @staticmethod
    def _parse_log_line(ts_ns: str, line: str) -> LogEntryPublic | None:
        try:
            ts = datetime.fromtimestamp(int(ts_ns) / 1e9, tz=UTC)
        except (TypeError, ValueError):
            ts = datetime.now(UTC)

        raw: dict[str, Any]
        try:
            raw = json.loads(line)
        except json.JSONDecodeError:
            raw = {"event": line}

        level = raw.get("level")
        if isinstance(level, str):
            level_value: str | None = level
        else:
            level_value = None

        message = raw.get("event") or raw.get("message")
        if message is not None and not isinstance(message, str):
            message = str(message)

        request_id = raw.get("request_id")
        if request_id is not None and not isinstance(request_id, str):
            request_id = str(request_id)

        return LogEntryPublic(
            timestamp=ts,
            level=level_value,
            message=message,
            request_id=request_id,
            raw=raw,
        )
