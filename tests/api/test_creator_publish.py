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

    progress = detail.json()["data"]["publish_progress"]
    assert progress is not None
    assert progress["platforms_total"] == 2
    assert progress["platforms_published"] == 0
    assert "部分" in progress["summary_label"] or "核对" in progress["summary_label"]


@pytest.mark.asyncio
async def test_publish_checklist_replace_clears_unchecked(client: AsyncClient) -> None:
    token = await register_token(client, "creator-pub-replace@example.com")
    project = await create_short_video_project(client, token)
    await advance_to_publish_step(client, token, project["id"], "short_video")
    headers = auth_headers(token)

    checklist = await client.get(
        f"/api/v1/creator/projects/{project['id']}/publish-checklist",
        headers=headers,
    )
    items = checklist.json()["data"]
    first_key = f"{items[0]['platform']}:{items[0]['item_key']}"
    second_key = f"{items[1]['platform']}:{items[1]['item_key']}"

    patch_both = await client.patch(
        f"/api/v1/creator/projects/{project['id']}/publish-checklist",
        headers=headers,
        json={"checked_keys": [first_key, second_key]},
    )
    assert patch_both.status_code == 200
    assert len([i for i in patch_both.json()["data"] if i["checked"]]) == 2

    patch_one = await client.patch(
        f"/api/v1/creator/projects/{project['id']}/publish-checklist",
        headers=headers,
        json={"checked_keys": [second_key]},
    )
    assert patch_one.status_code == 200
    checked = patch_one.json()["data"]
    assert len([i for i in checked if i["checked"]]) == 1
    assert checked[0]["platform"] == items[1]["platform"]
