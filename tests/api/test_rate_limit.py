import pytest
from httpx import AsyncClient

from app.cache.redis import get_redis_client
from app.core.config import Settings


@pytest.mark.asyncio
async def test_rate_limit(client: AsyncClient, test_settings: Settings) -> None:
    original_limit = test_settings.rate_limit_per_minute
    test_settings.rate_limit_per_minute = 2
    await get_redis_client().flushdb()

    try:
        for _ in range(2):
            response = await client.get("/api/v1/auth/me")
            assert response.status_code == 401

        blocked = await client.get("/api/v1/auth/me")
        assert blocked.status_code == 429
    finally:
        test_settings.rate_limit_per_minute = original_limit
        await get_redis_client().flushdb()


@pytest.mark.asyncio
async def test_rate_limit_returns_503_when_redis_unavailable(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class BrokenRedis:
        async def incr(self, *_args: object, **_kwargs: object) -> int:
            raise ConnectionError("redis down")

    monkeypatch.setattr(
        "app.middleware.rate_limit.get_redis_client",
        lambda: BrokenRedis(),
    )

    response = await client.get(
        "/api/v1/auth/me",
        headers={"X-Request-ID": "rate-limit-redis-down"},
    )
    assert response.status_code == 503
    body = response.json()
    assert body["code"] == 50301
    assert response.headers.get("X-Request-ID") == "rate-limit-redis-down"
