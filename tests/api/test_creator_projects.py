import pytest
from httpx import AsyncClient

from tests.api.creator_helpers import (
    auth_headers,
    create_short_video_project,
    register_token,
)


@pytest.mark.asyncio
async def test_create_and_confirm_step(client: AsyncClient) -> None:
    token = await register_token(client, "creator-proj@example.com")
    project = await create_short_video_project(client, token)
    assert project["current_step_key"] == "topic"
    assert project["pipeline_id"] == "short_video"

    confirm = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/topic/confirm",
        headers=auth_headers(token),
        json={"content": "初夏穿搭"},
    )
    assert confirm.status_code == 200
    updated = confirm.json()["data"]
    assert updated["current_step_key"] == "hook"

    listing = await client.get(
        "/api/v1/creator/projects",
        headers=auth_headers(token),
    )
    assert listing.status_code == 200
    assert len(listing.json()["data"]) == 1


@pytest.mark.asyncio
async def test_confirm_wrong_step_fails(client: AsyncClient) -> None:
    token = await register_token(client, "creator-proj-wrong@example.com")
    project = await create_short_video_project(client, token)
    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/hook/confirm",
        headers=auth_headers(token),
        json={"content": "skip"},
    )
    assert response.status_code == 400
    assert response.json()["code"] == 40012
