import pytest

from app.cache.redis import (
    cache_get,
    cache_set,
    close_redis_pool,
    get_redis_client,
    init_redis_pool,
)
from app.core.config import Settings


@pytest.fixture
async def redis_client(test_settings: Settings):
    await init_redis_pool(test_settings)
    client = get_redis_client()
    await client.flushdb()
    yield client
    await close_redis_pool()


@pytest.mark.asyncio
async def test_cache_set_and_get_roundtrip(redis_client) -> None:
    await cache_set(redis_client, "test:key", {"count": 2, "ok": True}, ttl_seconds=60)
    assert await cache_get(redis_client, "test:key") == {"count": 2, "ok": True}


@pytest.mark.asyncio
async def test_cache_get_returns_none_for_missing_key(redis_client) -> None:
    assert await cache_get(redis_client, "test:missing") is None
