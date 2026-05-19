import hashlib
import hmac
import json
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.config import Settings
from app.core.logging import get_logger

logger = get_logger(__name__)

EVENT_SUMMARIES: dict[str, str] = {
    "test": "Test alert from fastapi-kit admin",
    "ready_failed": "Service readiness check failed",
    "ready_recovered": "Service readiness restored",
    "beat_missing": "Celery Beat heartbeat is missing or stale",
    "beat_recovered": "Celery Beat heartbeat restored",
    "workers_missing": "No Celery workers available",
    "workers_recovered": "Celery workers are available again",
}


def validate_webhook_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        msg = "Webhook URL must use http or https"
        raise ValueError(msg)
    if not parsed.netloc:
        msg = "Webhook URL is invalid"
        raise ValueError(msg)


def build_alert_payload(
    *,
    event_type: str,
    settings: Settings,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "event": event_type,
        "environment": settings.environment,
        "summary": EVENT_SUMMARIES.get(event_type, event_type),
        "timestamp": datetime.now(UTC).isoformat(),
        "details": details or {},
    }


def sign_payload(body: bytes, secret: str) -> str:
    digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


async def post_webhook(
    *,
    url: str,
    payload: dict[str, Any],
    secret: str | None,
    timeout: float = 10.0,
) -> int | None:
    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["X-Alert-Signature"] = sign_payload(body, secret)

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(url, content=body, headers=headers)
        return response.status_code
