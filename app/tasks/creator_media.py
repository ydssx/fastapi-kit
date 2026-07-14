import asyncio
import uuid

from app.core.logging import get_logger
from app.tasks.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(name="app.tasks.creator_media.generate_creator_image")  # type: ignore[untyped-decorator]
def generate_creator_image(asset_id: str) -> dict[str, str]:
    async def _run() -> None:
        from app.db.session import dispose_engine, get_session_factory
        from app.services.creator_image_generation import CreatorImageGenerationService

        try:
            async with get_session_factory()() as session:
                await CreatorImageGenerationService(session).archive_generation(uuid.UUID(asset_id))
        finally:
            await dispose_engine()

    asyncio.run(_run())
    return {"status": "processed", "asset_id": asset_id}


@celery_app.task(name="app.tasks.creator_media.delete_creator_media_object")  # type: ignore[untyped-decorator]
def delete_creator_media_object(object_key: str) -> dict[str, str]:
    async def _run() -> None:
        from app.clients.object_storage import ObjectStorageClient
        from app.core.config import get_settings

        await ObjectStorageClient(get_settings()).delete(object_key)

    try:
        asyncio.run(_run())
    except Exception:
        logger.exception("creator_media_object_delete_failed", object_key=object_key)
        raise
    return {"status": "deleted", "object_key": object_key}
