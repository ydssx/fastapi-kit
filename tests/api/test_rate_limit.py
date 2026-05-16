import pytest
from httpx import AsyncClient

from app.cache.redis import get_redis_client
from app.core.config import Settings


@pytest.mark.asyncio
async def test_rate_limit(client: AsyncClient, test_settings: Settings) -> None:
    test_settings.rate_limit_per_minute = 2
    await get_redis_client().flushdb()

    for _ in range(2):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    blocked = await client.get("/api/v1/auth/me")
    assert blocked.status_code == 429
