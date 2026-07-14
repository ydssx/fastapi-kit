import pytest
from httpx import AsyncClient

from app.creator.pipelines import LONG_ARTICLE_STEPS, SHORT_VIDEO_STEPS
from tests.api.creator_helpers import register_token


@pytest.mark.asyncio
async def test_list_pipelines(client: AsyncClient) -> None:
    token = await register_token(client, "creator-pipelines@example.com")
    response = await client.get(
        "/api/v1/creator/pipelines",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    pipelines = {p["id"]: p for p in body["data"]}
    assert set(pipelines) == {"short_video", "long_article"}
    assert [s["key"] for s in pipelines["short_video"]["steps"]] == [
        s.key for s in SHORT_VIDEO_STEPS
    ]
    assert [s["key"] for s in pipelines["long_article"]["steps"]] == [
        s.key for s in LONG_ARTICLE_STEPS
    ]
    assert len(pipelines["short_video"]["steps"]) == 7
    assert len(pipelines["long_article"]["steps"]) == 7


@pytest.mark.asyncio
async def test_pipelines_require_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/creator/pipelines")
    assert response.status_code == 401
