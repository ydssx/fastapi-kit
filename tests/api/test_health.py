import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert body["data"]["status"] == "ok"


@pytest.mark.asyncio
async def test_ready(client: AsyncClient) -> None:
    response = await client.get("/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["database"] == "ok"
    assert body["data"]["redis"] == "ok"


@pytest.mark.asyncio
async def test_ready_returns_503_when_redis_ping_fails(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FailingRedis:
        async def ping(self) -> bool:
            raise OSError("redis unavailable")

    monkeypatch.setattr(
        "app.api.deps.get_redis_client",
        lambda: FailingRedis(),
    )

    response = await client.get("/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["code"] == 50300
    assert body["data"]["database"] == "ok"
    assert body["data"]["redis"] == "error"
