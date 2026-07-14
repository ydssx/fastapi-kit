import hashlib
import uuid
from collections.abc import AsyncIterable, Callable

from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.object_storage import ObjectStorageClient
from app.core.config import Settings, get_settings
from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.models.creator import CreatorMediaAsset, ProjectMediaAsset
from app.repositories.creator_media_asset import CreatorMediaAssetRepository
from app.services.creator_media_import import (
    CreatorMediaImportService,
    ValidatedImage,
    validate_image,
)

logger = get_logger(__name__)


class CreatorMediaService:
    def __init__(
        self,
        session: AsyncSession,
        settings: Settings | None = None,
        *,
        storage: ObjectStorageClient | None = None,
        importer: CreatorMediaImportService | None = None,
        schedule_cleanup: Callable[[str], object] | None = None,
    ) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.repository = CreatorMediaAssetRepository(session)
        self.storage = storage or ObjectStorageClient(self.settings)
        self.importer = importer or CreatorMediaImportService(
            max_bytes=self.settings.creator_media_max_upload_bytes,
            max_width=self.settings.creator_media_max_width,
            max_height=self.settings.creator_media_max_height,
        )
        self.schedule_cleanup = schedule_cleanup or self._schedule_cleanup

    async def upload(
        self,
        *,
        user_id: uuid.UUID,
        content: bytes | AsyncIterable[bytes],
        filename: str,
        declared_mime_type: str | None,
        category: str,
        tags: list[str],
    ) -> CreatorMediaAsset:
        image = await self._validate_upload(content, declared_mime_type)
        return await self._store_image(
            user_id=user_id,
            image=image,
            filename=filename,
            source="upload",
            source_url=None,
            category=category,
            tags=tags,
        )

    async def import_url(
        self,
        *,
        user_id: uuid.UUID,
        url: str,
        filename: str,
        category: str,
        tags: list[str],
    ) -> CreatorMediaAsset:
        image = await self.importer.download(url)
        return await self._store_image(
            user_id=user_id,
            image=image,
            filename=filename,
            source="url_import",
            source_url=url,
            category=category,
            tags=tags,
        )

    async def delete(self, *, user_id: uuid.UUID, asset_id: uuid.UUID) -> None:
        asset = await self.repository.get_by_id_for_user(asset_id, user_id)
        if asset is None:
            raise AppException("Media asset not found", code=40420, status_code=404)
        if not await self.repository.soft_delete_for_user(asset_id, user_id):
            raise AppException("Media asset not found", code=40420, status_code=404)
        await self.session.commit()
        self.schedule_cleanup(asset.object_key)

    async def get(self, *, user_id: uuid.UUID, asset_id: uuid.UUID) -> CreatorMediaAsset:
        asset = await self.repository.get_by_id_for_user(asset_id, user_id)
        if asset is None:
            raise AppException("Media asset not found", code=40420, status_code=404)
        return asset

    async def list_assets(
        self,
        *,
        user_id: uuid.UUID,
        category: str | None,
        tags: list[str] | None,
        keyword: str | None,
        status: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[CreatorMediaAsset], int]:
        return await self.repository.list_paginated_for_user(
            user_id,
            category=category,
            tags=tags,
            keyword=keyword,
            status=status,
            page=page,
            page_size=page_size,
        )

    async def list_project_associations(
        self, *, user_id: uuid.UUID, project_id: uuid.UUID
    ) -> list[tuple[ProjectMediaAsset, CreatorMediaAsset]]:
        if not await self.repository.project_exists_for_user(project_id, user_id):
            raise AppException("Project not found", code=40402, status_code=404)
        return await self.repository.list_project_associations_for_user(project_id, user_id)

    async def update_metadata(
        self,
        *,
        user_id: uuid.UUID,
        asset_id: uuid.UUID,
        filename: str | None,
        category: str | None,
        tags: list[str] | None,
    ) -> CreatorMediaAsset:
        asset = await self.get(user_id=user_id, asset_id=asset_id)
        if filename is not None:
            asset.original_filename = filename
        if category is not None:
            asset.category = category
        if tags is not None:
            asset.tags = tags
        await self.session.commit()
        await self.session.refresh(asset)
        return asset

    async def preview_url(self, *, user_id: uuid.UUID, asset_id: uuid.UUID) -> str:
        asset = await self.get(user_id=user_id, asset_id=asset_id)
        if asset.status != "ready":
            raise AppException("Media asset is not ready", code=40920, status_code=409)
        return await self.storage.preview_url(asset.object_key)

    async def associate(
        self,
        *,
        user_id: uuid.UUID,
        asset_id: uuid.UUID,
        project_id: uuid.UUID,
        step_key: str,
        reference_position: str,
    ) -> ProjectMediaAsset:
        association = await self.repository.create_project_association_for_user(
            user_id=user_id,
            project_id=project_id,
            media_asset_id=asset_id,
            step_key=step_key,
            reference_position=reference_position,
        )
        if association is None:
            raise AppException("Media asset or project not found", code=40420, status_code=404)
        await self.session.commit()
        return association

    async def disassociate(
        self,
        *,
        user_id: uuid.UUID,
        asset_id: uuid.UUID,
        association_id: uuid.UUID,
    ) -> None:
        if not await self.repository.delete_project_association_for_user(
            association_id=association_id,
            media_asset_id=asset_id,
            user_id=user_id,
        ):
            raise AppException("Media association not found", code=40421, status_code=404)
        await self.session.commit()

    async def _validate_upload(
        self, content: bytes | AsyncIterable[bytes], declared_mime_type: str | None
    ) -> ValidatedImage:
        if isinstance(content, bytes):
            content_bytes = content
        else:
            chunks: list[bytes] = []
            total = 0
            async for chunk in content:
                total += len(chunk)
                if total > self.settings.creator_media_max_upload_bytes:
                    raise AppException(
                        "Image exceeds the allowed size",
                        code=42230,
                        status_code=422,
                    )
                chunks.append(chunk)
            content_bytes = b"".join(chunks)
        return validate_image(
            content_bytes,
            declared_mime_type=declared_mime_type,
            max_bytes=self.settings.creator_media_max_upload_bytes,
            max_width=self.settings.creator_media_max_width,
            max_height=self.settings.creator_media_max_height,
        )

    async def _store_image(
        self,
        *,
        user_id: uuid.UUID,
        image: ValidatedImage,
        filename: str,
        source: str,
        source_url: str | None,
        category: str,
        tags: list[str],
    ) -> CreatorMediaAsset:
        asset_id = uuid.uuid4()
        extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[image.mime_type]
        asset = CreatorMediaAsset(
            id=asset_id,
            user_id=user_id,
            object_key=f"creator/{user_id}/uploads/{asset_id}.{extension}",
            original_filename=filename,
            mime_type=image.mime_type,
            byte_size=len(image.content),
            width=image.width,
            height=image.height,
            sha256=hashlib.sha256(image.content).hexdigest(),
            source=source,
            source_url=source_url,
            category=category,
            tags=tags,
            status="ready",
        )
        await self.storage.upload(asset.object_key, image.content, content_type=image.mime_type)
        await self.repository.create(asset)
        await self.session.commit()
        return asset

    @staticmethod
    def _schedule_cleanup(object_key: str) -> None:
        from app.tasks.creator_media import delete_creator_media_object

        try:
            delete_creator_media_object.delay(object_key)
        except Exception:
            logger.exception(
                "failed_to_schedule_media_object_cleanup",
                object_key=object_key,
            )
