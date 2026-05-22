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
    body = blocked.json()
    assert body["code"] == 42900
    assert body["message"] == "Rate limit exceeded"
    assert blocked.headers.get("X-Request-ID")


@pytest.mark.asyncio
async def test_rate_limit_redis_unavailable_returns_503(
    client: AsyncClient,
    test_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.rate_limit_per_minute = 2

    async def failing_incr(_key: str) -> int:
        raise ConnectionError("redis unavailable")

    redis = get_redis_client()
    monkeypatch.setattr(redis, "incr", failing_incr)

    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 503
    body = response.json()
    assert body["code"] == 50301
    assert body["message"] == "Rate limiting unavailable"
    assert response.headers.get("X-Request-ID")


@pytest.mark.asyncio
async def test_rate_limit_skips_health_and_options(
    client: AsyncClient,
    test_settings: Settings,
) -> None:
    test_settings.rate_limit_per_minute = 1
    await get_redis_client().flushdb()

    health = await client.get("/health")
    assert health.status_code == 200

    options = await client.options("/api/v1/auth/me")
    assert options.status_code in {200, 405}


@pytest.mark.asyncio
async def test_rate_limit_uses_forwarded_for_when_trust_proxy(
    client: AsyncClient,
    test_settings: Settings,
) -> None:
    test_settings.rate_limit_per_minute = 1
    test_settings.trust_proxy_headers = True
    await get_redis_client().flushdb()

    first_ip = await client.get(
        "/api/v1/auth/me",
        headers={"X-Forwarded-For": "198.51.100.1"},
    )
    assert first_ip.status_code == 401

    second_ip = await client.get(
        "/api/v1/auth/me",
        headers={"X-Forwarded-For": "198.51.100.2"},
    )
    assert second_ip.status_code == 401

    blocked_first_ip = await client.get(
        "/api/v1/auth/me",
        headers={"X-Forwarded-For": "198.51.100.1"},
    )
    assert blocked_first_ip.status_code == 429

    still_ok_second_ip = await client.get(
        "/api/v1/auth/me",
        headers={"X-Forwarded-For": "198.51.100.2"},
    )
    assert still_ok_second_ip.status_code == 401
