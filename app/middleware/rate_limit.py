import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.cache.redis import get_redis_client
from app.core.config import get_settings
from app.schemas.common import ApiResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        settings = get_settings()
        if not request.url.path.startswith("/api/v1"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        window = int(time.time() // 60)
        key = f"rate_limit:{client_ip}:{window}"

        try:
            redis = get_redis_client()
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, 60)
            if count > settings.rate_limit_per_minute:
                return JSONResponse(
                    status_code=429,
                    content=ApiResponse(
                        code=42900,
                        message="Rate limit exceeded",
                        data=None,
                    ).model_dump(),
                )
        except Exception:
            # If Redis is unavailable, do not block requests.
            return await call_next(request)

        return await call_next(request)
