import pytest
from httpx import AsyncClient

from tests.api.creator_helpers import (
    advance_to_publish_step,
    auth_headers,
    create_short_video_project,
    register_token,
)


@pytest.mark.asyncio
async def test_publish_checklist_and_partial_publish(client: AsyncClient) -> None:
    token = await register_token(client, "creator-pub@example.com")
    project = await create_short_video_project(client, token)
    await advance_to_publish_step(client, token, project["id"], "short_video")

    checklist = await client.get(
        f"/api/v1/creator/projects/{project['id']}/publish-checklist",
        headers=auth_headers(token),
    )
    assert checklist.status_code == 200
    items = checklist.json()["data"]
    assert len(items) > 0
    first_key = f"{items[0]['platform']}:{items[0]['item_key']}"

    patch = await client.patch(
        f"/api/v1/creator/projects/{project['id']}/publish-checklist",
        headers=auth_headers(token),
        json={"checked_keys": [first_key]},
    )
    assert patch.status_code == 200
    checked = [i for i in patch.json()["data"] if i["checked"]]
    assert len(checked) == 1

    detail = await client.get(
        f"/api/v1/creator/projects/{project['id']}",
        headers=auth_headers(token),
    )
    state = detail.json()["data"]["publish_checklist_state"]
    assert state[first_key] is True
