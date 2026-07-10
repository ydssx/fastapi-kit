import hashlib
import uuid
from collections.abc import Awaitable, Callable
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.image_generation import GeneratedImage, ImageGenerationClient
from app.clients.object_storage import ObjectStorageClient
from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.models.creator import CreatorMediaAsset
from app.repositories.creator_media_asset import CreatorMediaAssetRepository
from app.services.creator_media_import import validate_image

logger = get_logger(__name__)


class AssetRepository(Protocol):
    async def create(self, asset: CreatorMediaAsset) -> CreatorMediaAsset: ...


class ImageStorage(Protocol):
    async def upload(self, key: str, content: bytes, *, content_type: str) -> None: ...


class ImageGenerator(Protocol):
    async def generate(self, prompt: str, *, size: str = "1024x1024") -> GeneratedImage: ...


AssetLoader = Callable[[uuid.UUID], Awaitable[CreatorMediaAsset | None]]
TaskScheduler = Callable[[uuid.UUID], object]


class CreatorImageGenerationService:
    def __init__(
        self,
        session: AsyncSession,
        settings: Settings | None = None,
        *,
        repository: AssetRepository | None = None,
        storage: ImageStorage | None = None,
        generator: ImageGenerator | None = None,
        schedule_generation: TaskScheduler | None = None,
        asset_loader: AssetLoader | None = None,
    ) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.repository = repository or CreatorMediaAssetRepository(session)
        self.storage = storage or ObjectStorageClient(self.settings)
        self.generator = generator or ImageGenerationClient(self.settings)
        self.schedule_generation = schedule_generation or self._schedule_generation
        self.asset_loader = asset_loader or self._load_asset

    async def request_generation(
        self,
        *,
        user_id: uuid.UUID,
        prompt: str,
        category: str,
        tags: list[str],
        size: str = "1024x1024",
    ) -> CreatorMediaAsset:
        if not prompt.strip() or len(prompt) > self.settings.image_generation_max_prompt_chars:
            from app.core.exceptions import AppException

            raise AppException("Invalid image generation prompt", code=42220, status_code=422)
        asset_id = uuid.uuid4()
        asset = CreatorMediaAsset(
            id=asset_id,
            user_id=user_id,
            object_key=f"creator/{user_id}/generated/{asset_id}.png",
            original_filename="generated.png",
            mime_type="image/png",
            byte_size=0,
            sha256="0" * 64,
            source="generation",
            category=category,
            tags=tags,
            generation_metadata={"prompt": prompt, "size": size},
            status="processing",
        )
        created = await self.repository.create(asset)
        await self.session.commit()
        self.schedule_generation(created.id)
        return created

    async def archive_generation(self, asset_id: uuid.UUID) -> None:
        asset = await self.asset_loader(asset_id)
        if asset is None or asset.status != "processing" or asset.deleted_at is not None:
            return
        try:
            metadata = asset.generation_metadata or {}
            generated = await self.generator.generate(
                str(metadata.get("prompt", "")),
                size=str(metadata.get("size", "1024x1024")),
            )
            image = validate_image(
                generated.content,
                declared_mime_type=generated.media_type,
                max_bytes=self.settings.creator_media_max_upload_bytes,
                max_width=self.settings.creator_media_max_width,
                max_height=self.settings.creator_media_max_height,
            )
            await self.storage.upload(asset.object_key, image.content, content_type=image.mime_type)
            asset.mime_type = image.mime_type
            asset.byte_size = len(image.content)
            asset.width = image.width
            asset.height = image.height
            asset.sha256 = hashlib.sha256(image.content).hexdigest()
            asset.status = "ready"
            await self.session.commit()
        except Exception:
            logger.exception("creator_image_generation_failed", asset_id=str(asset_id))
            asset.status = "failed"
            metadata = dict(asset.generation_metadata or {})
            metadata["error"] = "generation_failed"
            asset.generation_metadata = metadata
            await self.session.commit()

    async def _load_asset(self, asset_id: uuid.UUID) -> CreatorMediaAsset | None:
        return await self.session.get(CreatorMediaAsset, asset_id)

    @staticmethod
    def _schedule_generation(asset_id: uuid.UUID) -> None:
        from app.tasks.creator_media import generate_creator_image

        generate_creator_image.delay(str(asset_id))
