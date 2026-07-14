import base64
import uuid
from types import SimpleNamespace

import pytest

from app.clients.image_generation import GeneratedImage
from app.services.creator_image_generation import CreatorImageGenerationService

PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/"
    "qWf1VwAAAABJRU5ErkJggg=="
)


class FakeSession:
    def __init__(self) -> None:
        self.committed = False

    async def commit(self) -> None:
        self.committed = True


class FakeRepository:
    def __init__(self, asset: object) -> None:
        self.asset = asset

    async def create(self, _asset: object) -> object:
        return self.asset


class FakeStorage:
    def __init__(self) -> None:
        self.uploaded: list[tuple[str, bytes, str]] = []

    async def upload(self, key: str, content: bytes, *, content_type: str) -> None:
        self.uploaded.append((key, content, content_type))


class FakeGenerator:
    async def generate(self, _prompt: str, *, size: str) -> GeneratedImage:
        return GeneratedImage(content=PNG_1X1, media_type="image/png")


@pytest.mark.asyncio
async def test_generation_request_schedules_only_after_commit() -> None:
    session = FakeSession()
    asset = SimpleNamespace(id=uuid.uuid4(), status="processing")
    scheduled: list[uuid.UUID] = []
    service = CreatorImageGenerationService(
        session,
        repository=FakeRepository(asset),
        schedule_generation=scheduled.append,
    )

    result = await service.request_generation(
        user_id=uuid.uuid4(),
        prompt="a sunrise",
        category="cover",
        tags=["warm"],
    )

    assert result is asset
    assert session.committed is True
    assert scheduled == [asset.id]


@pytest.mark.asyncio
async def test_generation_success_archives_ready_asset() -> None:
    asset = SimpleNamespace(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        object_key="creator/test/generated.png",
        status="processing",
        mime_type="",
        byte_size=0,
        width=None,
        height=None,
        sha256="",
        deleted_at=None,
        generation_metadata={"prompt": "sunrise"},
    )
    storage = FakeStorage()
    service = CreatorImageGenerationService(
        FakeSession(),
        repository=FakeRepository(asset),
        storage=storage,
        generator=FakeGenerator(),
        asset_loader=lambda _asset_id: _return(asset),
    )

    await service.archive_generation(asset.id)

    assert asset.status == "ready"
    assert asset.mime_type == "image/png"
    assert storage.uploaded == [(asset.object_key, PNG_1X1, "image/png")]


@pytest.mark.asyncio
async def test_generation_failure_marks_asset_failed() -> None:
    asset = SimpleNamespace(
        id=uuid.uuid4(),
        status="processing",
        deleted_at=None,
        generation_metadata={},
    )

    class FailingGenerator:
        async def generate(self, _prompt: str, *, size: str) -> GeneratedImage:
            raise RuntimeError("provider unavailable")

    service = CreatorImageGenerationService(
        FakeSession(),
        repository=FakeRepository(asset),
        storage=FakeStorage(),
        generator=FailingGenerator(),
        asset_loader=lambda _asset_id: _return(asset),
    )

    await service.archive_generation(asset.id)

    assert asset.status == "failed"


async def _return(value: object) -> object:
    return value
