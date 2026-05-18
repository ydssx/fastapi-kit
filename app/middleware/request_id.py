import re
import time
import uuid
from typing import TypeVar

import structlog
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.logging import get_logger

REQUEST_ID_HEADER = "X-Request-ID"
REQUEST_ID_MAX_LEN = 128
_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._\-:]+$")

_ResponseT = TypeVar("_ResponseT", bound=Response)


def normalize_request_id(raw: str | None) -> str:
    if raw is None:
        return str(uuid.uuid4())
    candidate = raw.strip()
    if not candidate or len(candidate) > REQUEST_ID_MAX_LEN:
        return str(uuid.uuid4())
    if not _REQUEST_ID_PATTERN.match(candidate):
        return str(uuid.uuid4())
    return candidate


def apply_request_id_header(response: _ResponseT) -> _ResponseT:
    request_id = structlog.contextvars.get_contextvars().get("request_id")
    if request_id is not None:
        response.headers[REQUEST_ID_HEADER] = str(request_id)
    return response


class RequestIDMiddleware:
    """Pure ASGI middleware (avoids BaseHTTPMiddleware breaking exception handlers)."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        request_id = normalize_request_id(request.headers.get(REQUEST_ID_HEADER))
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        method = scope.get("method", "")
        path = scope.get("path", "")
        start = time.perf_counter()
        status_code = 500
        header_name = REQUEST_ID_HEADER.lower().encode("latin-1")
        request_id_bytes = (header_name, request_id.encode("latin-1"))

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = list(message.get("headers", []))
                if not any(key == request_id_bytes[0] for key, _ in headers):
                    headers.append(request_id_bytes)
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            get_logger("http").info(
                "request_completed",
                method=method,
                path=path,
                status_code=status_code,
                duration_ms=duration_ms,
            )
