import json
from typing import Any

from redis.asyncio import ConnectionPool, Redis

from app.core.config import Settings, get_settings

_pool: ConnectionPool | None = None
_redis: Redis | None = None


async def init_redis_pool(settings: Settings | None = None) -> Redis:
    global _pool, _redis
    settings = settings or get_settings()
    _pool = ConnectionPool.from_url(
        str(settings.redis_url),
        decode_responses=True,
        max_connections=20,
    )
    _redis = Redis(connection_pool=_pool)
    return _redis


async def close_redis_pool() -> None:
    global _pool, _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
    if _pool is not None:
        await _pool.disconnect()
        _pool = None


def get_redis_client() -> Redis:
    if _redis is None:
        raise RuntimeError("Redis pool is not initialized")
    return _redis


async def cache_get(redis: Redis, key: str) -> Any | None:
    value = await redis.get(key)
    if value is None:
        return None
    return json.loads(value)


async def cache_set(redis: Redis, key: str, value: Any, ttl_seconds: int = 300) -> None:
    await redis.set(key, json.dumps(value), ex=ttl_seconds)
