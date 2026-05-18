import time

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.cache.redis import get_redis_client
from app.core.config import get_settings
from app.middleware.client_ip import get_client_ip
from app.middleware.request_id import apply_request_id_header
from app.schemas.common import ApiResponse


class RateLimitMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        settings = get_settings()
        if not request.url.path.startswith("/api/v1"):
            await self.app(scope, receive, send)
            return
        if scope.get("method") == "OPTIONS":
            await self.app(scope, receive, send)
            return

        client_ip = get_client_ip(request, trust_proxy_headers=settings.trust_proxy_headers)
        window = int(time.time() // 60)
        key = f"rate_limit:{client_ip}:{window}"

        try:
            redis = get_redis_client()
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, 60)
            if count > settings.rate_limit_per_minute:
                response = apply_request_id_header(
                    JSONResponse(
                        status_code=429,
                        content=ApiResponse(
                            code=42900,
                            message="Rate limit exceeded",
                            data=None,
                        ).model_dump(),
                    )
                )
                await response(scope, receive, send)
                return
        except Exception:
            response = apply_request_id_header(
                JSONResponse(
                    status_code=503,
                    content=ApiResponse(
                        code=50301,
                        message="Rate limiting unavailable",
                        data=None,
                    ).model_dump(),
                )
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)
