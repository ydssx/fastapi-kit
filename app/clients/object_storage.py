from typing import Any

import aioboto3  # type: ignore[import-untyped]
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore[import-untyped]

from app.core.config import Settings
from app.core.exceptions import AppException


class ObjectStorageClient:
    """Async S3-compatible object storage client for creator media."""

    def __init__(self, settings: Settings, *, session: Any | None = None) -> None:
        self._settings = settings
        self._session = session if session is not None else aioboto3.Session()

    async def upload(self, key: str, content: bytes, *, content_type: str) -> None:
        try:
            async with self._client() as client:
                await client.put_object(
                    Bucket=self._settings.object_storage_bucket,
                    Key=key,
                    Body=content,
                    ContentType=content_type,
                )
        except (BotoCoreError, ClientError) as exc:
            raise self._storage_error() from exc

    async def read(self, key: str) -> bytes:
        try:
            async with self._client() as client:
                response = await client.get_object(
                    Bucket=self._settings.object_storage_bucket,
                    Key=key,
                )
                body = response["Body"]
                return bytes(await body.read())
        except (BotoCoreError, ClientError) as exc:
            raise self._storage_error() from exc

    async def delete(self, key: str) -> None:
        try:
            async with self._client() as client:
                await client.delete_object(Bucket=self._settings.object_storage_bucket, Key=key)
        except (BotoCoreError, ClientError) as exc:
            raise self._storage_error() from exc

    async def preview_url(self, key: str) -> str:
        try:
            async with self._client() as client:
                return str(
                    await client.generate_presigned_url(
                        "get_object",
                        Params={"Bucket": self._settings.object_storage_bucket, "Key": key},
                        ExpiresIn=self._settings.object_storage_presign_ttl_seconds,
                    )
                )
        except (BotoCoreError, ClientError) as exc:
            raise self._storage_error() from exc

    def _client(self) -> Any:
        self._validate_configuration()
        return self._session.client(
            "s3",
            endpoint_url=self._settings.object_storage_endpoint,
            region_name=self._settings.object_storage_region,
            aws_access_key_id=self._settings.object_storage_access_key,
            aws_secret_access_key=self._settings.object_storage_secret_key,
        )

    def _validate_configuration(self) -> None:
        if not (
            self._settings.object_storage_endpoint
            and self._settings.object_storage_bucket
            and self._settings.object_storage_access_key
            and self._settings.object_storage_secret_key
        ):
            raise AppException(
                "Object storage is not configured",
                code=50310,
                status_code=503,
            )

    @staticmethod
    def _storage_error() -> AppException:
        return AppException("Object storage request failed", code=50311, status_code=503)
