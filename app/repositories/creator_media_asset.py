import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.creator import ContentProject, CreatorMediaAsset, ProjectMediaAsset


class CreatorMediaAssetRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, asset: CreatorMediaAsset) -> CreatorMediaAsset:
        self.session.add(asset)
        await self.session.flush()
        await self.session.refresh(asset)
        return asset

    async def get_by_id_for_user(
        self, asset_id: uuid.UUID, user_id: uuid.UUID
    ) -> CreatorMediaAsset | None:
        result = await self.session.execute(
            select(CreatorMediaAsset).where(
                CreatorMediaAsset.id == asset_id,
                CreatorMediaAsset.user_id == user_id,
                CreatorMediaAsset.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        category: str | None = None,
        tags: list[str] | None = None,
        keyword: str | None = None,
        status: str | None = None,
    ) -> list[CreatorMediaAsset]:
        assets, _ = await self.list_paginated_for_user(
            user_id,
            category=category,
            tags=tags,
            keyword=keyword,
            status=status,
            page=1,
            page_size=100,
        )
        return assets

    async def list_paginated_for_user(
        self,
        user_id: uuid.UUID,
        *,
        category: str | None = None,
        tags: list[str] | None = None,
        keyword: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[CreatorMediaAsset], int]:
        query = select(CreatorMediaAsset).where(
            CreatorMediaAsset.user_id == user_id,
            CreatorMediaAsset.deleted_at.is_(None),
        )
        count_query = select(func.count()).select_from(CreatorMediaAsset).where(
            CreatorMediaAsset.user_id == user_id,
            CreatorMediaAsset.deleted_at.is_(None),
        )
        if category is not None:
            query = query.where(CreatorMediaAsset.category == category)
            count_query = count_query.where(CreatorMediaAsset.category == category)
        if tags:
            query = query.where(CreatorMediaAsset.tags.contains(tags))
            count_query = count_query.where(CreatorMediaAsset.tags.contains(tags))
        if keyword:
            name_condition = CreatorMediaAsset.original_filename.ilike(f"%{keyword}%")
            query = query.where(name_condition)
            count_query = count_query.where(name_condition)
        if status is not None:
            query = query.where(CreatorMediaAsset.status == status)
            count_query = count_query.where(CreatorMediaAsset.status == status)

        total = int((await self.session.scalar(count_query)) or 0)
        offset = (page - 1) * page_size
        result = await self.session.scalars(
            query.order_by(CreatorMediaAsset.created_at.desc()).offset(offset).limit(page_size)
        )
        return list(result.all()), total

    async def soft_delete_for_user(self, asset_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.session.scalars(
            update(CreatorMediaAsset)
            .where(
                CreatorMediaAsset.id == asset_id,
                CreatorMediaAsset.user_id == user_id,
                CreatorMediaAsset.deleted_at.is_(None),
            )
            .values(deleted_at=datetime.now(UTC))
            .returning(CreatorMediaAsset.id)
        )
        await self.session.flush()
        return result.first() is not None

    async def create_project_association_for_user(
        self,
        *,
        user_id: uuid.UUID,
        project_id: uuid.UUID,
        media_asset_id: uuid.UUID,
        step_key: str,
        reference_position: str,
    ) -> ProjectMediaAsset | None:
        project = await self.session.scalar(
            select(ContentProject).where(
                ContentProject.id == project_id,
                ContentProject.user_id == user_id,
            )
        )
        asset = await self.session.scalar(
            select(CreatorMediaAsset).where(
                CreatorMediaAsset.id == media_asset_id,
                CreatorMediaAsset.user_id == user_id,
                CreatorMediaAsset.deleted_at.is_(None),
            )
        )
        if project is None or asset is None:
            return None

        association = ProjectMediaAsset(
            project_id=project_id,
            media_asset_id=media_asset_id,
            step_key=step_key,
            reference_position=reference_position,
        )
        self.session.add(association)
        await self.session.flush()
        await self.session.refresh(association)
        return association

    async def list_assets_for_project_for_user(
        self, project_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[CreatorMediaAsset]:
        result = await self.session.scalars(
            select(CreatorMediaAsset)
            .join(ProjectMediaAsset, ProjectMediaAsset.media_asset_id == CreatorMediaAsset.id)
            .join(ContentProject, ContentProject.id == ProjectMediaAsset.project_id)
            .where(
                ContentProject.id == project_id,
                ContentProject.user_id == user_id,
                CreatorMediaAsset.user_id == user_id,
                CreatorMediaAsset.deleted_at.is_(None),
            )
            .order_by(ProjectMediaAsset.created_at)
        )
        return list(result.all())

    async def project_exists_for_user(self, project_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        return (
            await self.session.scalar(
                select(ContentProject.id).where(
                    ContentProject.id == project_id,
                    ContentProject.user_id == user_id,
                )
            )
        ) is not None

    async def list_project_associations_for_user(
        self, project_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[tuple[ProjectMediaAsset, CreatorMediaAsset]]:
        result = await self.session.execute(
            select(ProjectMediaAsset, CreatorMediaAsset)
            .join(CreatorMediaAsset, CreatorMediaAsset.id == ProjectMediaAsset.media_asset_id)
            .join(ContentProject, ContentProject.id == ProjectMediaAsset.project_id)
            .where(
                ProjectMediaAsset.project_id == project_id,
                ContentProject.user_id == user_id,
                CreatorMediaAsset.user_id == user_id,
            )
            .order_by(ProjectMediaAsset.created_at)
        )
        return list(result.tuples().all())

    async def list_associations_for_asset_for_user(
        self, media_asset_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[ProjectMediaAsset]:
        result = await self.session.scalars(
            select(ProjectMediaAsset)
            .join(CreatorMediaAsset, CreatorMediaAsset.id == ProjectMediaAsset.media_asset_id)
            .join(ContentProject, ContentProject.id == ProjectMediaAsset.project_id)
            .where(
                ProjectMediaAsset.media_asset_id == media_asset_id,
                CreatorMediaAsset.user_id == user_id,
                CreatorMediaAsset.deleted_at.is_(None),
                ContentProject.user_id == user_id,
            )
            .order_by(ProjectMediaAsset.created_at)
        )
        return list(result.all())

    async def delete_project_association_for_user(
        self,
        *,
        association_id: uuid.UUID,
        media_asset_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        result = await self.session.execute(
            select(ProjectMediaAsset)
            .join(CreatorMediaAsset, CreatorMediaAsset.id == ProjectMediaAsset.media_asset_id)
            .join(ContentProject, ContentProject.id == ProjectMediaAsset.project_id)
            .where(
                ProjectMediaAsset.id == association_id,
                ProjectMediaAsset.media_asset_id == media_asset_id,
                CreatorMediaAsset.user_id == user_id,
                CreatorMediaAsset.deleted_at.is_(None),
                ContentProject.user_id == user_id,
            )
        )
        association = result.scalar_one_or_none()
        if association is None:
            return False
        await self.session.delete(association)
        await self.session.flush()
        return True
