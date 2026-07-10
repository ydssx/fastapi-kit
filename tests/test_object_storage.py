import pytest
from botocore.exceptions import EndpointConnectionError

from app.clients.image_generation import ImageGenerationClient
from app.clients.object_storage import ObjectStorageClient
from app.core.config import Settings
from app.core.exceptions import AppException


class FakeS3Client:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}

    async def put_object(self, *, Bucket: str, Key: str, Body: bytes, ContentType: str) -> None:
        assert Bucket == "creator-media"
        assert ContentType == "image/png"
        self.objects[Key] = Body

    async def get_object(self, *, Bucket: str, Key: str) -> dict[str, object]:
        assert Bucket == "creator-media"
        return {"Body": FakeBody(self.objects[Key]), "ContentType": "image/png"}

    async def delete_object(self, *, Bucket: str, Key: str) -> None:
        assert Bucket == "creator-media"
        del self.objects[Key]

    async def generate_presigned_url(
        self, ClientMethod: str, Params: dict[str, str], ExpiresIn: int
    ) -> str:
        assert ClientMethod == "get_object"
        assert Params == {"Bucket": "creator-media", "Key": "assets/example.png"}
        assert ExpiresIn == 900
        return "https://storage.example.test/signed-preview"


class FakeBody:
    def __init__(self, content: bytes) -> None:
        self.content = content

    async def read(self) -> bytes:
        return self.content


class FakeS3Context:
    def __init__(self, client: FakeS3Client) -> None:
        self.client = client

    async def __aenter__(self) -> FakeS3Client:
        return self.client

    async def __aexit__(self, *_args: object) -> None:
        return None


class FakeSession:
    def __init__(self, client: FakeS3Client) -> None:
        self._s3_client = client

    def client(self, _service_name: str, **_kwargs: object) -> FakeS3Context:
        return FakeS3Context(self._s3_client)


class FailingS3Client(FakeS3Client):
    async def get_object(self, *, Bucket: str, Key: str) -> dict[str, object]:
        raise EndpointConnectionError(endpoint_url="http://minio:9000")


@pytest.mark.asyncio
async def test_object_storage_uses_replaceable_s3_session() -> None:
    settings = Settings(
        object_storage_endpoint="http://minio:9000",
        object_storage_bucket="creator-media",
        object_storage_access_key="minioadmin",
        object_storage_secret_key="minioadmin",
    )
    fake_s3 = FakeS3Client()
    storage = ObjectStorageClient(settings, session=FakeSession(fake_s3))

    await storage.upload("assets/example.png", b"image-data", content_type="image/png")

    assert await storage.read("assets/example.png") == b"image-data"
    assert await storage.preview_url("assets/example.png") == "https://storage.example.test/signed-preview"

    await storage.delete("assets/example.png")
    assert fake_s3.objects == {}


@pytest.mark.asyncio
async def test_storage_and_generation_require_credentials() -> None:
    storage = ObjectStorageClient(Settings())
    generator = ImageGenerationClient(Settings())

    with pytest.raises(AppException, match="Object storage is not configured") as storage_error:
        await storage.read("assets/example.png")
    assert storage_error.value.code == 50310

    with pytest.raises(AppException, match="Image generation is not configured") as generator_error:
        await generator.generate("A studio photo of a kitten")
    assert generator_error.value.code == 50320


@pytest.mark.asyncio
async def test_storage_failure_does_not_expose_credentials() -> None:
    settings = Settings(
        object_storage_endpoint="http://minio:9000",
        object_storage_access_key="minioadmin",
        object_storage_secret_key="minioadmin",
    )
    storage = ObjectStorageClient(settings, session=FakeSession(FailingS3Client()))

    with pytest.raises(AppException, match="Object storage request failed") as error:
        await storage.read("assets/example.png")

    assert error.value.code == 50311
    assert "minioadmin" not in str(error.value)
