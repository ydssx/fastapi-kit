import pytest
from httpx import AsyncClient

from tests.api.creator_helpers import (
    advance_to_publish_step,
    auth_headers,
    check_all_publish_items,
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


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient) -> None:
    token = await register_token(client, "creator-del@example.com")
    project = await create_short_video_project(client, token)
    project_id = project["id"]

    delete = await client.delete(
        f"/api/v1/creator/projects/{project_id}",
        headers=auth_headers(token),
    )
    assert delete.status_code == 204

    detail = await client.get(
        f"/api/v1/creator/projects/{project_id}",
        headers=auth_headers(token),
    )
    assert detail.status_code == 404

    listing = await client.get(
        "/api/v1/creator/projects",
        headers=auth_headers(token),
    )
    assert listing.json()["data"] == []


@pytest.mark.asyncio
async def test_update_title_and_platforms(client: AsyncClient) -> None:
    token = await register_token(client, "creator-patch@example.com")
    project = await create_short_video_project(client, token, platforms=["xiaohongshu"])

    patch = await client.patch(
        f"/api/v1/creator/projects/{project['id']}",
        headers=auth_headers(token),
        json={"title": "新标题", "target_platform_keys": ["xiaohongshu", "wechat"]},
    )
    assert patch.status_code == 200
    data = patch.json()["data"]
    assert data["title"] == "新标题"
    assert set(data["target_platforms"]) == {"xiaohongshu", "wechat"}


@pytest.mark.asyncio
async def test_create_single_platform_auto_primary(client: AsyncClient) -> None:
    token = await register_token(client, "creator-primary-auto@example.com")
    response = await client.post(
        "/api/v1/creator/projects",
        headers=auth_headers(token),
        json={
            "pipeline_id": "short_video",
            "title": "单平台",
            "target_platform_keys": ["xiaohongshu"],
        },
    )
    assert response.status_code == 201
    assert response.json()["data"]["primary_platform_key"] == "xiaohongshu"


@pytest.mark.asyncio
async def test_create_multi_platform_requires_primary(client: AsyncClient) -> None:
    token = await register_token(client, "creator-primary-req@example.com")
    response = await client.post(
        "/api/v1/creator/projects",
        headers=auth_headers(token),
        json={
            "pipeline_id": "short_video",
            "title": "多平台",
            "target_platform_keys": ["xiaohongshu", "wechat"],
        },
    )
    assert response.status_code == 400
    assert response.json()["code"] == 40025


@pytest.mark.asyncio
async def test_update_platforms_clears_invalid_primary(client: AsyncClient) -> None:
    token = await register_token(client, "creator-primary-clear@example.com")
    project = await create_short_video_project(
        client,
        token,
        platforms=["xiaohongshu", "wechat"],
        primary_platform_key="xiaohongshu",
    )

    patch = await client.patch(
        f"/api/v1/creator/projects/{project['id']}",
        headers=auth_headers(token),
        json={"target_platform_keys": ["douyin", "wechat"]},
    )
    assert patch.status_code == 200
    assert patch.json()["data"]["primary_platform_key"] is None


@pytest.mark.asyncio
async def test_update_platforms_blocked_on_publish_step(client: AsyncClient) -> None:
    token = await register_token(client, "creator-patch-pub@example.com")
    project = await create_short_video_project(client, token)

    await advance_to_publish_step(client, token, project["id"], "short_video")

    patch = await client.patch(
        f"/api/v1/creator/projects/{project['id']}",
        headers=auth_headers(token),
        json={"target_platform_keys": ["douyin"]},
    )
    assert patch.status_code == 400
    assert patch.json()["code"] == 40023


@pytest.mark.asyncio
async def test_open_step_and_reconfirm_creates_new_version(client: AsyncClient) -> None:
    token = await register_token(client, "creator-open@example.com")
    project = await create_short_video_project(client, token)
    project_id = project["id"]
    headers = auth_headers(token)

    await client.post(
        f"/api/v1/creator/projects/{project_id}/steps/topic/confirm",
        headers=headers,
        json={"content": "初版选题"},
    )

    open_resp = await client.post(
        f"/api/v1/creator/projects/{project_id}/steps/topic/open",
        headers=headers,
    )
    assert open_resp.status_code == 200
    opened = open_resp.json()["data"]
    assert opened["current_step_key"] == "topic"
    assert opened["draft_content"]["topic"] == "初版选题"

    confirm = await client.post(
        f"/api/v1/creator/projects/{project_id}/steps/topic/confirm",
        headers=headers,
        json={"content": "修订选题"},
    )
    assert confirm.status_code == 200
    assert confirm.json()["data"]["current_step_key"] == "hook"

    artifacts = await client.get(
        f"/api/v1/creator/projects/{project_id}/artifacts",
        headers=headers,
    )
    topic_versions = [a for a in artifacts.json()["data"] if a["step_key"] == "topic"]
    assert len(topic_versions) == 2
    assert topic_versions[-1]["content"] == "修订选题"


@pytest.mark.asyncio
async def test_open_unconfirmed_step_fails(client: AsyncClient) -> None:
    token = await register_token(client, "creator-open-fail@example.com")
    project = await create_short_video_project(client, token)
    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/hook/open",
        headers=auth_headers(token),
    )
    assert response.status_code == 400
    assert response.json()["code"] == 40024


@pytest.mark.asyncio
async def test_completed_project_patch_title_only(client: AsyncClient) -> None:
    token = await register_token(client, "creator-completed-title@example.com")
    project = await create_short_video_project(client, token)
    project_id = project["id"]
    headers = auth_headers(token)

    await advance_to_publish_step(client, token, project_id, "short_video")
    await check_all_publish_items(client, token, project_id)

    complete = await client.post(
        f"/api/v1/creator/projects/{project_id}/complete",
        headers=headers,
    )
    assert complete.status_code == 200

    patch_title = await client.patch(
        f"/api/v1/creator/projects/{project_id}",
        headers=headers,
        json={"title": "完成后新标题"},
    )
    assert patch_title.status_code == 200
    assert patch_title.json()["data"]["title"] == "完成后新标题"

    patch_platforms = await client.patch(
        f"/api/v1/creator/projects/{project_id}",
        headers=headers,
        json={"target_platform_keys": ["douyin"]},
    )
    assert patch_platforms.status_code == 400
    assert patch_platforms.json()["code"] == 40023


@pytest.mark.asyncio
async def test_list_includes_publish_progress(client: AsyncClient) -> None:
    token = await register_token(client, "creator-list-progress@example.com")
    project = await create_short_video_project(client, token)
    await advance_to_publish_step(client, token, project["id"], "short_video")

    listing = await client.get(
        "/api/v1/creator/projects",
        headers=auth_headers(token),
    )
    assert listing.status_code == 200
    row = listing.json()["data"][0]
    assert row["publish_progress"] is not None
    assert row["publish_progress"]["platforms_total"] == 2
