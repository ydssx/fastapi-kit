import uuid

import pytest
import structlog
from httpx import AsyncClient

from app.middleware.request_id import REQUEST_ID_MAX_LEN, get_request_id, normalize_request_id


def test_normalize_request_id_generates_uuid_when_missing() -> None:
    request_id = normalize_request_id(None)
    uuid.UUID(request_id)


def test_normalize_request_id_accepts_valid_client_id() -> None:
    client_id = "550e8400-e29b-41d4-a716-446655440000"
    assert normalize_request_id(client_id) == client_id


def test_get_request_id_returns_bound_context_value() -> None:
    structlog.contextvars.clear_contextvars()
    try:
        assert get_request_id() is None
        structlog.contextvars.bind_contextvars(request_id="trace-abc")
        assert get_request_id() == "trace-abc"
    finally:
        structlog.contextvars.clear_contextvars()


@pytest.mark.parametrize(
    "raw",
    [
        "",
        " " * 3,
        "x" * (REQUEST_ID_MAX_LEN + 1),
        "bad id with spaces",
        "bad\nnewline",
    ],
)
def test_normalize_request_id_rejects_invalid_values(raw: str) -> None:
    request_id = normalize_request_id(raw)
    uuid.UUID(request_id)
    assert request_id != raw.strip() or not raw.strip()


@pytest.mark.asyncio
async def test_health_returns_request_id_header(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    request_id = response.headers.get("X-Request-ID")
    assert request_id is not None
    uuid.UUID(request_id)


@pytest.mark.asyncio
async def test_client_request_id_is_echoed(client: AsyncClient) -> None:
    client_id = "550e8400-e29b-41d4-a716-446655440000"
    response = await client.get("/health", headers={"X-Request-ID": client_id})
    assert response.headers.get("X-Request-ID") == client_id


@pytest.mark.asyncio
async def test_invalid_request_id_is_replaced(client: AsyncClient) -> None:
    response = await client.get("/health", headers={"X-Request-ID": "not valid!"})
    echoed = response.headers.get("X-Request-ID")
    assert echoed is not None
    assert echoed != "not valid!"
    uuid.UUID(echoed)


@pytest.mark.asyncio
async def test_error_response_includes_request_id(client: AsyncClient) -> None:
    response = await client.get("/does-not-exist", headers={"X-Request-ID": "trace-me-123"})
    assert response.status_code == 404
    assert response.headers.get("X-Request-ID") == "trace-me-123"
