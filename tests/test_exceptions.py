import logging

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings, get_settings
from app.main import create_app


@pytest.fixture
def error_app(test_settings: Settings):
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: test_settings

    @app.get("/test-unhandled-error")
    async def trigger_error() -> None:
        raise RuntimeError("boom")

    yield app
    get_settings.cache_clear()
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_unhandled_exception_returns_request_id(error_app) -> None:
    # Prometheus instrumentator re-raises after the JSON error response is sent.
    transport = ASGITransport(app=error_app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/test-unhandled-error",
            headers={"X-Request-ID": "err-trace-001"},
        )

    assert response.status_code == 500
    assert response.headers.get("X-Request-ID") == "err-trace-001"
    body = response.json()
    assert body["code"] == 50000
    assert "boom" in body["message"]


@pytest.mark.asyncio
async def test_unhandled_exception_is_logged(error_app, caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.ERROR)
    transport = ASGITransport(app=error_app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get("/test-unhandled-error")

    assert "unhandled_exception" in caplog.text
    assert "boom" in caplog.text
