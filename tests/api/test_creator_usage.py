import pytest
from httpx import AsyncClient

from tests.api.creator_helpers import (
    advance_to_publish_step,
    auth_headers,
    create_short_video_project,
    register_token,
)


@pytest.mark.asyncio
async def test_complete_project_quota(client: AsyncClient) -> None:
    token = await register_token(client, "creator-quota@example.com")
    headers = auth_headers(token)

    for i in range(2):
        project = await create_short_video_project(client, token, title=f"项目{i}")
        await advance_to_publish_step(client, token, project["id"], "short_video")
        complete = await client.post(
            f"/api/v1/creator/projects/{project['id']}/complete",
            headers=headers,
        )
        assert complete.status_code == 200

    project3 = await create_short_video_project(client, token, title="项目3")
    await advance_to_publish_step(client, token, project3["id"], "short_video")
    blocked = await client.post(
        f"/api/v1/creator/projects/{project3['id']}/complete",
        headers=headers,
    )
    assert blocked.status_code == 402
    assert blocked.json()["code"] == 40202
