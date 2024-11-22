import time
from typing import Dict, Tuple

from fastapi import HTTPException, Request

from app.core.cache import cache
from app.core.logger import logger


class RateLimiter:
    def __init__(
        self,
        times: int = 10,  # 允许的请求次数
        seconds: int = 60  # 时间窗口（秒）
    ):
        self.times = times
        self.seconds = seconds

    async def is_rate_limited(self, key: str) -> Tuple[bool, Dict]:
        """
        检查是否超出速率限制
        返回：(是否限制, 限制信息)
        """
        current = time.time()
        cache_key = f"rate_limit:{key}"

        # 获取现有记录
        record = await cache.get(cache_key)
        if not record:
            record = {
                "count": 0,
                "start_time": current,
                "reset_time": current + self.seconds
            }

        # 如果时间窗口已过，重置计数
        if current > record["reset_time"]:
            record = {
                "count": 0,
                "start_time": current,
                "reset_time": current + self.seconds
            }

        # 增加计数
        record["count"] += 1

        # 更新缓存
        await cache.set(cache_key, record, expire=self.seconds)

        # 检查是否超出限制
        is_limited = record["count"] > self.times
        if is_limited:
            logger.warning(f"Rate limit exceeded for key: {key}")

        return is_limited, {
            "limit": self.times,
            "remaining": max(0, self.times - record["count"]),
            "reset": record["reset_time"],
            "current": record["count"]
        }

class RateLimitMiddleware:
    def __init__(
        self,
        times: int = 100,  # 每个IP每分钟允许的请求次数
        seconds: int = 60
    ):
        self.limiter = RateLimiter(times, seconds)

    async def __call__(self, request: Request, call_next):
        # 获取客户端IP
        client_ip = request.client.host
        
        # 检查是否超出限制
        is_limited, info = await self.limiter.is_rate_limited(client_ip)
        
        if is_limited:
            raise HTTPException(
                status_code=429,
                detail="Too many requests",
                headers={
                    "X-RateLimit-Limit": str(info["limit"]),
                    "X-RateLimit-Remaining": str(info["remaining"]),
                    "X-RateLimit-Reset": str(int(info["reset"])),
                }
            )
        
        # 添加速率限制信息到响应头
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
        response.headers["X-RateLimit-Reset"] = str(int(info["reset"]))
        
        return response
