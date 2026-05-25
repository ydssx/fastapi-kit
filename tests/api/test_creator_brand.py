import pytest
from httpx import AsyncClient

from tests.api.creator_helpers import auth_headers, register_token


@pytest.mark.asyncio
async def test_brand_profile_roundtrip(client: AsyncClient) -> None:
    token = await register_token(client, "creator-brand@example.com")
    headers = auth_headers(token)
    put = await client.put(
        "/api/v1/creator/brand-profile",
        headers=headers,
        json={
            "tone": "口语化",
            "audience": "都市青年",
            "taboos": "夸张承诺",
            "structure_notes": "三段式",
        },
    )
    assert put.status_code == 200
    get = await client.get("/api/v1/creator/brand-profile", headers=headers)
    assert get.status_code == 200
    data = get.json()["data"]
    assert data["tone"] == "口语化"
    assert data["taboos"] == "夸张承诺"
