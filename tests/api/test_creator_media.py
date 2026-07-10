import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.creator import CreatorMediaAsset
from app.repositories.user import UserRepository
from tests.api.creator_helpers import auth_headers, create_short_video_project, register_token


async def _create_asset(
    db_session: AsyncSession,
    *,
    email: str,
    filename: str = "cover.png",
    category: str = "cover",
    tags: list[str] | None = None,
) -> CreatorMediaAsset:
    user = await UserRepository(db_session).get_by_email(email)
    assert user is not None
    asset = CreatorMediaAsset(
        id=uuid.uuid4(),
        user_id=user.id,
        object_key=f"creator/{user.id}/uploads/{uuid.uuid4()}.png",
        original_filename=filename,
        mime_type="image/png",
        byte_size=12,
        width=1,
        height=1,
        sha256="a" * 64,
        source="upload",
        category=category,
        tags=tags or ["social"],
        status="ready",
    )
    db_session.add(asset)
    await db_session.commit()
    return asset


@pytest.mark.asyncio
async def test_media_list_filters_and_uses_envelope(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    token = await register_token(client, "creator-media-list@example.com")
    await _create_asset(
        db_session,
        email="creator-media-list@example.com",
        filename="summer-cover.png",
        tags=["summer"],
    )
    await _create_asset(
        db_session,
        email="creator-media-list@example.com",
        filename="other.png",
        category="other",
        tags=["winter"],
    )

    response = await client.get(
        "/api/v1/creator/media?category=cover&tags=summer&keyword=summer&page=1&page_size=1",
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert body["data"]["total"] == 1
    assert body["data"]["items"][0]["original_filename"] == "summer-cover.png"


@pytest.mark.asyncio
async def test_media_isolated_and_deleted_asset_cannot_preview(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_token = await register_token(client, "creator-media-owner@example.com")
    other_token = await register_token(client, "creator-media-other@example.com")
    asset = await _create_asset(db_session, email="creator-media-owner@example.com")

    forbidden = await client.get(
        f"/api/v1/creator/media/{asset.id}",
        headers=auth_headers(other_token),
    )
    assert forbidden.status_code == 404

    deleted = await client.delete(
        f"/api/v1/creator/media/{asset.id}",
        headers=auth_headers(owner_token),
    )
    assert deleted.status_code == 204

    preview = await client.get(
        f"/api/v1/creator/media/{asset.id}/preview",
        headers=auth_headers(owner_token),
    )
    assert preview.status_code == 404


@pytest.mark.asyncio
async def test_media_association_and_disassociation(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    token = await register_token(client, "creator-media-link@example.com")
    asset = await _create_asset(db_session, email="creator-media-link@example.com")
    project = await create_short_video_project(client, token)

    created = await client.post(
        f"/api/v1/creator/media/{asset.id}/associations",
        headers=auth_headers(token),
        json={
            "project_id": project["id"],
            "step_key": "topic",
            "reference_position": "12",
        },
    )
    assert created.status_code == 201
    association = created.json()["data"]
    assert association["asset_reference"] == f"asset://{asset.id}"

    removed = await client.delete(
        f"/api/v1/creator/media/{asset.id}/associations/{association['id']}",
        headers=auth_headers(token),
    )
    assert removed.status_code == 204


@pytest.mark.asyncio
async def test_project_media_associations_include_soft_deleted_assets_and_are_isolated(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    owner_email = "creator-media-project-associations@example.com"
    owner_token = await register_token(client, owner_email)
    other_token = await register_token(
        client, "creator-media-project-associations-other@example.com"
    )
    asset = await _create_asset(db_session, email=owner_email)
    project = await create_short_video_project(client, owner_token)

    created = await client.post(
        f"/api/v1/creator/media/{asset.id}/associations",
        headers=auth_headers(owner_token),
        json={
            "project_id": project["id"],
            "step_key": "topic",
            "reference_position": "append",
        },
    )
    assert created.status_code == 201

    asset.deleted_at = datetime.now(UTC)
    await db_session.commit()

    response = await client.get(
        f"/api/v1/creator/projects/{project['id']}/media-associations",
        headers=auth_headers(owner_token),
    )
    assert response.status_code == 200
    association = response.json()["data"][0]
    assert association["id"] == created.json()["data"]["id"]
    assert association["step_key"] == "topic"
    assert association["asset"]["id"] == str(asset.id)
    assert association["asset"]["status"] == "deleted"
    assert association["is_invalid"] is True

    forbidden = await client.get(
        f"/api/v1/creator/projects/{project['id']}/media-associations",
        headers=auth_headers(other_token),
    )
    assert forbidden.status_code == 404


@pytest.mark.asyncio
async def test_media_upload_rejects_invalid_file_and_requires_auth(client: AsyncClient) -> None:
    unauthenticated = await client.get("/api/v1/creator/media")
    assert unauthenticated.status_code == 401

    token = await register_token(client, "creator-media-upload@example.com")
    invalid_upload = await client.post(
        "/api/v1/creator/media/upload",
        headers=auth_headers(token),
        data={"category": "cover"},
        files={"file": ("not-an-image.txt", b"not an image", "text/plain")},
    )
    assert invalid_upload.status_code == 422
