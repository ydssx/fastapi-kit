import json
import re
import time
from typing import Callable, Dict, Set

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.logger import logger
from app.core.security_config import SECURITY_CONFIG


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, redis_client=None, exclude_paths: Set[str] = None):
        super().__init__(app)
        self.redis_client = redis_client
        self.exclude_paths = exclude_paths or set()
        self.rate_limits = SECURITY_CONFIG["rate_limiting"]
        self.security_headers = SECURITY_CONFIG["security_headers"]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 跳过不需要安全检查的路径
        if request.url.path in self.exclude_paths:
            return await call_next(request)

        # 1. 速率限制检查
        if not await self._check_rate_limit(request):
            return Response(content="Rate limit exceeded", status_code=429)

        # 2. 检查请求大小
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 10 * 1024 * 1024:  # 10MB
            return Response(content="Request too large", status_code=413)

        # 3. 验证请求头
        if not self._validate_headers(request):
            return Response(content="Invalid headers", status_code=400)

        # 4. 处理响应
        response: Response = await call_next(request)

        # 5. 添加安全响应头
        response.headers.update(self.security_headers)

        # 6. 记录审计日志
        if SECURITY_CONFIG["audit_logging"]["enabled"]:
            await self._log_audit(request, response)

        return response

    async def _check_rate_limit(self, request: Request) -> bool:
        if not self.redis_client:
            return True

        # 获取客户端IP
        client_ip = request.client.host

        # 确定速率限制类型
        limit_key = "default"
        if "/auth" in request.url.path:
            limit_key = "auth"
        elif "/api" in request.url.path:
            limit_key = "api"

        # 获取限制配置
        limit_config = self.rate_limits[limit_key]
        requests_per_minute = limit_config["requests_per_minute"]
        burst_size = limit_config["burst_size"]

        # 使用Redis实现令牌桶算法
        bucket_key = f"rate_limit:{client_ip}:{limit_key}"

        pipeline = self.redis_client.pipeline()
        current_time = time.time()

        # 获取当前令牌数和上次更新时间
        tokens, last_update = await self.redis_client.hmget(
            bucket_key, ["tokens", "last_update"]
        ) or (burst_size, current_time)

        tokens = float(tokens) if tokens else burst_size
        last_update = float(last_update) if last_update else current_time

        # 计算新的令牌数
        time_passed = current_time - last_update
        new_tokens = min(
            burst_size, tokens + time_passed * (requests_per_minute / 60.0)
        )

        # 如果有足够的令牌
        if new_tokens >= 1:
            pipeline.hmset(
                bucket_key, {"tokens": new_tokens - 1, "last_update": current_time}
            )
            pipeline.expire(bucket_key, 60)  # 1分钟过期
            await pipeline.execute()
            return True

        return False

    def _validate_headers(self, request: Request) -> bool:
        # 检查Content-Type
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            if not content_type:
                return False
            if (
                "multipart/form-data" not in content_type
                and "application/json" not in content_type
                and "application/x-www-form-urlencoded" not in content_type
            ):
                return False

        # 检查User-Agent
        user_agent = request.headers.get("user-agent", "")
        if not user_agent:
            return False

        # 检查Accept
        accept = request.headers.get("accept", "")
        if not accept:
            return False

        return True

    async def _log_audit(self, request: Request, response: Response):
        """记录审计日志"""
        audit_config = SECURITY_CONFIG["audit_logging"]

        # 准备日志数据
        log_data = {
            "timestamp": time.time(),
            "client_ip": request.client.host,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "user_agent": request.headers.get("user-agent"),
        }

        # 如果配置允许，记录请求体
        if audit_config["include_request_body"]:
            try:
                body = await request.body()
                # 过滤敏感字段
                body_dict = json.loads(body)
                for field in audit_config["sensitive_fields"]:
                    if field in body_dict:
                        body_dict[field] = "***"
                log_data["request_body"] = body_dict
            except:
                pass

        # 记录日志
        logger.log(audit_config["log_level"], f"Audit Log: {json.dumps(log_data)}")


def add_security_middleware(app: FastAPI, redis_client=None):
    """添加安全中间件到应用"""
    app.add_middleware(
        SecurityMiddleware,
        redis_client=redis_client,
        exclude_paths={"/health", "/metrics"},
    )
