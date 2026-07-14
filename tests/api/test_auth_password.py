import pytest
from httpx import AsyncClient

from app.cache.redis import get_redis_client
from app.core.config import Settings
from app.services.auth import PASSWORD_RESET_TOKEN_PREFIX
from tests.api.creator_helpers import auth_headers, register_token


@pytest.mark.asyncio
async def test_change_password_success(client: AsyncClient) -> None:
    token = await register_token(client, "pwd-change@example.com")
    response = await client.post(
        "/api/v1/auth/change-password",
        headers=auth_headers(token),
        json={"current_password": "securepass123", "new_password": "newsecure123"},
    )
    assert response.status_code == 200

    old_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "pwd-change@example.com", "password": "securepass123"},
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "pwd-change@example.com", "password": "newsecure123"},
    )
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_current(client: AsyncClient) -> None:
    token = await register_token(client, "pwd-wrong@example.com")
    response = await client.post(
        "/api/v1/auth/change-password",
        headers=auth_headers(token),
        json={"current_password": "wrongpass123", "new_password": "newsecure123"},
    )
    assert response.status_code == 400
    assert response.json()["code"] == 40106


@pytest.mark.asyncio
async def test_forgot_password_without_smtp(client: AsyncClient) -> None:
    await register_token(client, "pwd-forgot@example.com")
    response = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "pwd-forgot@example.com"},
    )
    assert response.status_code == 503
    assert response.json()["code"] == 50301


@pytest.mark.asyncio
async def test_forgot_password_unknown_email_with_smtp(
    client: AsyncClient,
    test_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configured = test_settings.model_copy(
        update={"smtp_host": "smtp.test.local", "smtp_from": "noreply@test.local"},
    )
    monkeypatch.setattr("app.core.config.get_settings", lambda: configured)
    monkeypatch.setattr("app.api.deps.get_settings", lambda: configured)

    async def noop_send(*_args, **_kwargs) -> None:
        return None

    monkeypatch.setattr("app.services.auth.send_password_reset_email", noop_send)

    response = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "missing@example.com"},
    )
    assert response.status_code == 200
    assert "重置邮件" in response.json()["data"]["message"]


@pytest.mark.asyncio
async def test_forgot_and_reset_password_flow(
    client: AsyncClient,
    test_settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configured = test_settings.model_copy(
        update={"smtp_host": "smtp.test.local", "smtp_from": "noreply@test.local"},
    )
    monkeypatch.setattr("app.core.config.get_settings", lambda: configured)
    monkeypatch.setattr("app.api.deps.get_settings", lambda: configured)
    captured: dict[str, str] = {}

    async def capture_send(_settings, *, to_email: str, reset_url: str) -> None:
        captured["email"] = to_email
        captured["url"] = reset_url

    monkeypatch.setattr("app.services.auth.send_password_reset_email", capture_send)

    await register_token(client, "pwd-reset@example.com")
    forgot = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "pwd-reset@example.com"},
    )
    assert forgot.status_code == 200
    assert captured["email"] == "pwd-reset@example.com"
    token = captured["url"].split("token=")[1]

    reset = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "resetpass123"},
    )
    assert reset.status_code == 200

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "pwd-reset@example.com", "password": "resetpass123"},
    )
    assert login.status_code == 200

    redis = get_redis_client()
    assert await redis.get(f"{PASSWORD_RESET_TOKEN_PREFIX}{token}") is None


@pytest.mark.asyncio
async def test_reset_password_invalid_token(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": "invalid-token-value", "new_password": "resetpass123"},
    )
    assert response.status_code == 400
    assert response.json()["code"] == 40022
