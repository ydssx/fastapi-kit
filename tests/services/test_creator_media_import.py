import base64
import socket

import pytest

from app.core.exceptions import AppException
from app.services import creator_media_import
from app.services.creator_media_import import CreatorMediaImportService

PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/"
    "qWf1VwAAAABJRU5ErkJggg=="
)


class FakeResponse:
    def __init__(self, status_code: int, headers: dict[str, str], chunks: list[bytes]) -> None:
        self.status_code = status_code
        self.headers = headers
        self._chunks = chunks

    async def aiter_bytes(self):
        for chunk in self._chunks:
            yield chunk


class FakeHttpClient:
    def __init__(self, response: FakeResponse) -> None:
        self.response = response
        self.calls: list[str] = []

    async def get(self, url: str, **_kwargs: object) -> FakeResponse:
        self.calls.append(url)
        return self.response


class CloseableFakeHttpClient(FakeHttpClient):
    def __init__(self, response: FakeResponse) -> None:
        super().__init__(response)
        self.closed = False

    async def aclose(self) -> None:
        self.closed = True


class SequentialFakeHttpClient:
    def __init__(self, responses: list[FakeResponse]) -> None:
        self.responses = responses
        self.calls: list[str] = []

    async def get(self, url: str, **_kwargs: object) -> FakeResponse:
        self.calls.append(url)
        return self.responses.pop(0)


def public_resolver(host: str, _port: int | None = None) -> list[tuple[object, ...]]:
    if host == "127.0.0.1":
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 80))]
    assert host == "images.example.com"
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.8.8", 443))]


@pytest.mark.asyncio
async def test_import_rejects_private_resolved_address_before_request() -> None:
    client = FakeHttpClient(FakeResponse(200, {"content-type": "image/png"}, [PNG_1X1]))

    def private_resolver(_host: str, _port: int | None = None) -> list[tuple[object, ...]]:
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443))]

    service = CreatorMediaImportService(
        max_bytes=1024,
        max_width=100,
        max_height=100,
        http_client=client,
        resolver=private_resolver,
    )

    with pytest.raises(AppException, match="URL import host is not allowed"):
        await service.download("https://images.example.com/photo.png")

    assert client.calls == []


@pytest.mark.asyncio
async def test_import_revalidates_redirect_target_and_rejects_private_host() -> None:
    client = FakeHttpClient(FakeResponse(302, {"location": "http://127.0.0.1/private.png"}, []))
    service = CreatorMediaImportService(
        max_bytes=1024,
        max_width=100,
        max_height=100,
        http_client=client,
        resolver=public_resolver,
    )

    with pytest.raises(AppException, match="URL import host is not allowed"):
        await service.download("https://images.example.com/photo.png")

    assert client.calls == ["https://images.example.com/photo.png"]


@pytest.mark.asyncio
async def test_import_rejects_mime_spoofed_image() -> None:
    client = FakeHttpClient(FakeResponse(200, {"content-type": "image/png"}, [b"not an image"]))
    service = CreatorMediaImportService(
        max_bytes=1024,
        max_width=100,
        max_height=100,
        http_client=client,
        resolver=public_resolver,
    )

    with pytest.raises(AppException, match="Invalid image content"):
        await service.download("https://images.example.com/photo.png")


@pytest.mark.asyncio
async def test_import_resolves_each_host_off_the_event_loop(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = SequentialFakeHttpClient(
        [
            FakeResponse(302, {"location": "https://cdn.example.com/photo.png"}, []),
            FakeResponse(500, {}, []),
        ]
    )
    resolved_hosts: list[str] = []

    def redirect_resolver(
        host: str, _port: int | None = None
    ) -> list[tuple[object, ...]]:
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.8.8", 443))]

    async def fake_to_thread(
        function: object, *args: object, **kwargs: object
    ) -> list[tuple[object, ...]]:
        assert function is redirect_resolver
        assert not kwargs
        resolved_hosts.append(args[0])
        return redirect_resolver(*args)

    monkeypatch.setattr(creator_media_import.asyncio, "to_thread", fake_to_thread)
    service = CreatorMediaImportService(
        max_bytes=1024,
        max_width=100,
        max_height=100,
        http_client=client,
        resolver=redirect_resolver,
    )

    with pytest.raises(AppException, match="URL import request failed"):
        await service.download("https://images.example.com/photo.png")

    assert resolved_hosts == ["images.example.com", "cdn.example.com"]


@pytest.mark.asyncio
async def test_import_closes_only_its_internal_http_client(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    internal_client = CloseableFakeHttpClient(
        FakeResponse(500, {"content-type": "image/png"}, [])
    )
    injected_client = CloseableFakeHttpClient(
        FakeResponse(500, {"content-type": "image/png"}, [])
    )
    monkeypatch.setattr(creator_media_import.httpx, "AsyncClient", lambda: internal_client)

    internal_service = CreatorMediaImportService(
        max_bytes=1024,
        max_width=100,
        max_height=100,
        resolver=public_resolver,
    )
    injected_service = CreatorMediaImportService(
        max_bytes=1024,
        max_width=100,
        max_height=100,
        http_client=injected_client,
        resolver=public_resolver,
    )

    with pytest.raises(AppException, match="URL import request failed"):
        await internal_service.download("https://images.example.com/photo.png")
    with pytest.raises(AppException, match="URL import request failed"):
        await injected_service.download("https://images.example.com/photo.png")

    assert internal_client.closed is True
    assert injected_client.closed is False
