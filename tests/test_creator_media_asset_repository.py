import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.creator import ContentProject, CreatorMediaAsset
from app.models.user import User
from app.repositories.creator_media_asset import CreatorMediaAssetRepository


@pytest.mark.asyncio
async def test_list_for_user_excludes_another_users_asset(db_session: AsyncSession) -> None:
    owner = User(email="owner@example.com", hashed_password="hash")
    other_user = User(email="other@example.com", hashed_password="hash")
    db_session.add_all([owner, other_user])
    await db_session.flush()

    repository = CreatorMediaAssetRepository(db_session)
    asset = CreatorMediaAsset(
        user_id=owner.id,
        object_key="creator/owner/asset.png",
        original_filename="asset.png",
        mime_type="image/png",
        byte_size=100,
        sha256="a" * 64,
        source="upload",
        category="reference",
        status="ready",
    )
    await repository.create(asset)

    assert await repository.list_for_user(other_user.id) == []


@pytest.mark.asyncio
async def test_list_for_user_filters_category_tags_and_filename(
    db_session: AsyncSession,
) -> None:
    user = User(email="filters@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.flush()
    repository = CreatorMediaAssetRepository(db_session)
    first = CreatorMediaAsset(
        user_id=user.id,
        object_key="creator/filters/first.png",
        original_filename="summer-cover.png",
        mime_type="image/png",
        byte_size=100,
        sha256="b" * 64,
        source="upload",
        category="cover",
        tags=["summer", "travel"],
        status="ready",
    )
    second = CreatorMediaAsset(
        user_id=user.id,
        object_key="creator/filters/second.png",
        original_filename="office-reference.png",
        mime_type="image/png",
        byte_size=100,
        sha256="c" * 64,
        source="upload",
        category="reference",
        tags=["office"],
        status="ready",
    )
    await repository.create(first)
    await repository.create(second)

    assets, total = await repository.list_paginated_for_user(
        user.id,
        category="cover",
        tags=["summer"],
        keyword="cover",
    )

    assert total == 1
    assert [asset.id for asset in assets] == [first.id]


@pytest.mark.asyncio
async def test_asset_can_be_associated_with_multiple_project_steps_and_soft_deleted(
    db_session: AsyncSession,
) -> None:
    user = User(email="associations@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.flush()
    project = ContentProject(
        user_id=user.id,
        pipeline_id="short_video",
        title="项目",
        current_step_key="topic",
    )
    second_project = ContentProject(
        user_id=user.id,
        pipeline_id="short_video",
        title="第二个项目",
        current_step_key="script",
    )
    db_session.add_all([project, second_project])
    await db_session.flush()
    repository = CreatorMediaAssetRepository(db_session)
    asset = CreatorMediaAsset(
        user_id=user.id,
        object_key="creator/associations/asset.png",
        original_filename="asset.png",
        mime_type="image/png",
        byte_size=100,
        sha256="d" * 64,
        source="upload",
        category="cover",
        status="ready",
    )
    await repository.create(asset)

    topic_association = await repository.create_project_association_for_user(
        user_id=user.id,
        project_id=project.id,
        media_asset_id=asset.id,
        step_key="topic",
        reference_position="asset://topic-cover",
    )
    script_association = await repository.create_project_association_for_user(
        user_id=user.id,
        project_id=second_project.id,
        media_asset_id=asset.id,
        step_key="script",
        reference_position="asset://script-cover",
    )

    assert topic_association is not None
    assert script_association is not None
    assert len(await repository.list_assets_for_project_for_user(project.id, user.id)) == 1
    assert len(await repository.list_assets_for_project_for_user(second_project.id, user.id)) == 1

    assert await repository.soft_delete_for_user(asset.id, user.id)
    assert await repository.get_by_id_for_user(asset.id, user.id) is None
    assert await repository.list_assets_for_project_for_user(project.id, user.id) == []
    assert await repository.list_assets_for_project_for_user(second_project.id, user.id) == []
