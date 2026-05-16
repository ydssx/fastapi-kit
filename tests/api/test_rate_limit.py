import pytest
from httpx import AsyncClient

from app.core.config import Settings


@pytest.mark.asyncio
async def test_rate_limit(client: AsyncClient, test_settings: Settings) -> None:
    test_settings.rate_limit_per_minute = 2

    for _ in range(2):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code in (401, 200)

    blocked = await client.get("/api/v1/auth/me")
    assert blocked.status_code == 429
