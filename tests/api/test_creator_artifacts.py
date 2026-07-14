import pytest
from httpx import AsyncClient

from tests.api.creator_helpers import auth_headers, create_short_video_project, register_token


@pytest.mark.asyncio
async def test_artifacts_after_confirm(client: AsyncClient) -> None:
    token = await register_token(client, "creator-art@example.com")
    project = await create_short_video_project(client, token)
    await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/topic/confirm",
        headers=auth_headers(token),
        json={"content": "脚本主题"},
    )
    artifacts = await client.get(
        f"/api/v1/creator/projects/{project['id']}/artifacts",
        headers=auth_headers(token),
    )
    assert artifacts.status_code == 200
    rows = artifacts.json()["data"]
    assert len(rows) >= 1
    assert rows[0]["step_key"] == "topic"
    assert "脚本主题" in rows[0]["content"]

    detail = await client.get(
        f"/api/v1/creator/projects/{project['id']}",
        headers=auth_headers(token),
    )
    assert detail.json()["data"]["artifacts"][0]["step_key"] == "topic"
