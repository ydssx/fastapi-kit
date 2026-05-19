import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.repositories.user import UserRepository


async def _register(client: AsyncClient, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "securepass123"},
    )
    assert response.status_code == 201
    return response.json()["data"]["tokens"]["access_token"]


async def _make_admin(db_engine, email: str) -> None:
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        user = await repo.get_by_email(email)
        assert user is not None
        await repo.promote_to_admin(user)
        await session.commit()


@pytest.mark.asyncio
async def test_alert_settings_defaults(client: AsyncClient, db_engine) -> None:
    admin_email = "alerts-admin@example.com"
    token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    response = await client.get(
        "/api/v1/admin/alerts/settings",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["webhook_enabled"] is False
    assert data["webhook_secret_configured"] is False
    assert data["recovery_notifications_enabled"] is True


@pytest.mark.asyncio
async def test_alert_test_requires_webhook(client: AsyncClient, db_engine) -> None:
    admin_email = "alerts-test@example.com"
    token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    response = await client.post(
        "/api/v1/admin/alerts/test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert response.json()["code"] == 40006


@pytest.mark.asyncio
async def test_alert_update_and_deliveries(
    client: AsyncClient,
    db_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    admin_email = "alerts-update@example.com"
    token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    calls: list[int] = []

    async def fake_post(
        *, url: str, payload: dict, secret: str | None, timeout: float = 10.0
    ) -> int:
        calls.append(1)
        return 200

    monkeypatch.setattr(
        "app.services.admin_alerts.post_webhook",
        fake_post,
    )

    patch = await client.patch(
        "/api/v1/admin/alerts/settings",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "webhook_url": "https://example.com/hook",
            "webhook_secret": "secret",
            "recovery_notifications_enabled": True,
        },
    )
    assert patch.status_code == 200
    assert patch.json()["data"]["webhook_enabled"] is True
    assert patch.json()["data"]["webhook_secret_configured"] is True

    test_resp = await client.post(
        "/api/v1/admin/alerts/test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert test_resp.status_code == 200
    assert test_resp.json()["data"]["sent"] is True
    assert calls

    deliveries = await client.get(
        "/api/v1/admin/alerts/deliveries",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert deliveries.status_code == 200
    assert deliveries.json()["data"]["total"] >= 1
