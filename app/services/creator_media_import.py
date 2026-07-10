import asyncio
import ipaddress
import socket
from collections.abc import AsyncIterator, Callable, Mapping
from dataclasses import dataclass
from typing import Any, Protocol, cast
from urllib.parse import urljoin, urlsplit

import httpx

from app.core.exceptions import AppException

_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp"}
_REDIRECT_CODES = {301, 302, 303, 307, 308}


@dataclass(frozen=True)
class ValidatedImage:
    content: bytes
    mime_type: str
    width: int
    height: int


class DownloadResponse(Protocol):
    status_code: int
    headers: Mapping[str, str]

    def aiter_bytes(self) -> AsyncIterator[bytes]: ...


class HttpClient(Protocol):
    async def get(self, url: str, **kwargs: object) -> DownloadResponse: ...


Resolver = Callable[[str, int | None], list[tuple[Any, ...]]]


def _resolve_host(host: str, port: int | None) -> list[tuple[Any, ...]]:
    return list(socket.getaddrinfo(host, port, type=socket.SOCK_STREAM))


def validate_image(
    content: bytes,
    *,
    declared_mime_type: str | None,
    max_bytes: int,
    max_width: int,
    max_height: int,
) -> ValidatedImage:
    if not content or len(content) > max_bytes:
        raise AppException("Image exceeds the allowed size", code=42230, status_code=422)
    mime_type, width, height = _image_details(content)
    declared = (declared_mime_type or "").split(";", 1)[0].strip().lower()
    if declared and (declared not in _MEDIA_TYPES or declared != mime_type):
        raise AppException("Invalid image content", code=42231, status_code=422)
    if width <= 0 or height <= 0 or width > max_width or height > max_height:
        raise AppException("Image dimensions exceed the allowed limit", code=42232, status_code=422)
    return ValidatedImage(content=content, mime_type=mime_type, width=width, height=height)


def _image_details(content: bytes) -> tuple[str, int, int]:
    if (
        content.startswith(b"\x89PNG\r\n\x1a\n")
        and len(content) >= 24
        and content[12:16] == b"IHDR"
    ):
        return (
            "image/png",
            int.from_bytes(content[16:20], "big"),
            int.from_bytes(content[20:24], "big"),
        )
    if content.startswith(b"\xff\xd8"):
        return "image/jpeg", *_jpeg_dimensions(content)
    if content.startswith(b"RIFF") and len(content) >= 30 and content[8:12] == b"WEBP":
        return "image/webp", *_webp_dimensions(content)
    raise AppException("Invalid image content", code=42231, status_code=422)


def _jpeg_dimensions(content: bytes) -> tuple[int, int]:
    index = 2
    while index + 9 <= len(content):
        if content[index] != 0xFF:
            raise AppException("Invalid image content", code=42231, status_code=422)
        while index < len(content) and content[index] == 0xFF:
            index += 1
        marker = content[index]
        index += 1
        if marker in {0xD8, 0xD9} or 0xD0 <= marker <= 0xD7:
            continue
        if index + 2 > len(content):
            break
        segment_length = int.from_bytes(content[index : index + 2], "big")
        if segment_length < 2 or index + segment_length > len(content):
            break
        if marker in {
            *range(0xC0, 0xC4),
            *range(0xC5, 0xC8),
            *range(0xC9, 0xCC),
            *range(0xCD, 0xD0),
        }:
            return (
                int.from_bytes(content[index + 5 : index + 7], "big"),
                int.from_bytes(content[index + 3 : index + 5], "big"),
            )
        index += segment_length
    raise AppException("Invalid image content", code=42231, status_code=422)


def _webp_dimensions(content: bytes) -> tuple[int, int]:
    chunk = content[12:16]
    if chunk == b"VP8X" and len(content) >= 30:
        return (
            int.from_bytes(content[24:27], "little") + 1,
            int.from_bytes(content[27:30], "little") + 1,
        )
    if chunk == b"VP8 " and len(content) >= 30 and content[23:26] == b"\x9d\x01\x2a":
        return int.from_bytes(content[26:28], "little") & 0x3FFF, int.from_bytes(
            content[28:30], "little"
        ) & 0x3FFF
    if chunk == b"VP8L" and len(content) >= 25 and content[20] == 0x2F:
        value = int.from_bytes(content[21:25], "little")
        return (value & 0x3FFF) + 1, ((value >> 14) & 0x3FFF) + 1
    raise AppException("Invalid image content", code=42231, status_code=422)


class CreatorMediaImportService:
    def __init__(
        self,
        *,
        max_bytes: int,
        max_width: int,
        max_height: int,
        http_client: HttpClient | None = None,
        resolver: Resolver = _resolve_host,
        max_redirects: int = 3,
        timeout_seconds: float = 15,
    ) -> None:
        self.max_bytes = max_bytes
        self.max_width = max_width
        self.max_height = max_height
        self._owns_http_client = http_client is None
        self.http_client = http_client or cast(HttpClient, httpx.AsyncClient())
        self.resolver = resolver
        self.max_redirects = max_redirects
        self.timeout_seconds = timeout_seconds

    async def download(self, url: str) -> ValidatedImage:
        try:
            current_url = url
            for _ in range(self.max_redirects + 1):
                await self._validate_url(current_url)
                response = await self.http_client.get(
                    current_url,
                    follow_redirects=False,
                    timeout=self.timeout_seconds,
                )
                if response.status_code in _REDIRECT_CODES:
                    location = response.headers.get("location")
                    if not location:
                        raise AppException(
                            "URL import redirect is invalid",
                            code=42233,
                            status_code=422,
                        )
                    current_url = urljoin(current_url, location)
                    continue
                if response.status_code < 200 or response.status_code >= 300:
                    raise AppException("URL import request failed", code=42234, status_code=422)
                content = await self._read_limited(response)
                return validate_image(
                    content,
                    declared_mime_type=response.headers.get("content-type"),
                    max_bytes=self.max_bytes,
                    max_width=self.max_width,
                    max_height=self.max_height,
                )
            raise AppException("URL import exceeded redirect limit", code=42235, status_code=422)
        finally:
            if self._owns_http_client:
                await cast(httpx.AsyncClient, self.http_client).aclose()

    async def _read_limited(self, response: DownloadResponse) -> bytes:
        chunks: list[bytes] = []
        total = 0
        async for chunk in response.aiter_bytes():
            total += len(chunk)
            if total > self.max_bytes:
                raise AppException("Image exceeds the allowed size", code=42230, status_code=422)
            chunks.append(chunk)
        return b"".join(chunks)

    async def _validate_url(self, url: str) -> None:
        parsed = urlsplit(url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username:
            raise AppException("URL import host is not allowed", code=42236, status_code=422)
        try:
            addresses = await asyncio.to_thread(self.resolver, parsed.hostname, parsed.port)
        except (OSError, ValueError) as exc:
            raise AppException(
                "URL import host could not be resolved",
                code=42237,
                status_code=422,
            ) from exc
        if not addresses:
            raise AppException("URL import host could not be resolved", code=42237, status_code=422)
        for address in addresses:
            ip = ipaddress.ip_address(str(address[4][0]))
            if not ip.is_global:
                raise AppException("URL import host is not allowed", code=42236, status_code=422)
