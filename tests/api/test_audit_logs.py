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
async def test_audit_log_created_on_user_update(client: AsyncClient, db_engine) -> None:
    admin_email = "audit-admin@example.com"
    target_email = "audit-target@example.com"

    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    await client.post(
        "/api/v1/auth/register",
        json={"email": target_email, "password": "securepass123"},
    )

    listed = await client.get(
        "/api/v1/admin/users?email=audit-target",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    target_id = listed.json()["data"]["items"][0]["id"]

    patch_response = await client.patch(
        f"/api/v1/admin/users/{target_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False},
    )
    assert patch_response.status_code == 200
    response_request_id = patch_response.headers.get("X-Request-ID")
    assert response_request_id

    logs = await client.get(
        "/api/v1/admin/audit-logs?action=user.update",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert logs.status_code == 200
    items = logs.json()["data"]["items"]
    assert len(items) >= 1
    assert items[0]["action"] == "user.update"
    assert items[0]["resource_type"] == "user"
    assert items[0]["request_id"] == response_request_id


@pytest.mark.asyncio
async def test_audit_log_request_id_on_alert_settings_update(
    client: AsyncClient,
    db_engine,
) -> None:
    admin_email = "audit-alert-settings@example.com"
    trace_id = "alert-settings-trace-001"
    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    patch_response = await client.patch(
        "/api/v1/admin/alerts/settings",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Request-ID": trace_id,
        },
        json={"recovery_notifications_enabled": False},
    )
    assert patch_response.status_code == 200
    assert patch_response.headers.get("X-Request-ID") == trace_id

    logs = await client.get(
        "/api/v1/admin/audit-logs?action=alert.settings_update",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert logs.status_code == 200
    items = logs.json()["data"]["items"]
    assert len(items) >= 1
    assert items[0]["action"] == "alert.settings_update"
    assert items[0]["request_id"] == trace_id


@pytest.mark.asyncio
async def test_audit_log_request_id_on_alert_test_send(
    client: AsyncClient,
    db_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    admin_email = "audit-alert-test@example.com"
    trace_id = "alert-test-trace-002"
    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    async def fake_post(
        *, url: str, payload: dict, secret: str | None, timeout: float = 10.0
    ) -> int:
        return 200

    monkeypatch.setattr("app.services.admin_alerts.post_webhook", fake_post)

    await client.patch(
        "/api/v1/admin/alerts/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"webhook_url": "https://example.com/hook"},
    )

    test_response = await client.post(
        "/api/v1/admin/alerts/test",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "X-Request-ID": trace_id,
        },
    )
    assert test_response.status_code == 200
    assert test_response.headers.get("X-Request-ID") == trace_id

    logs = await client.get(
        "/api/v1/admin/audit-logs?action=alert.test_send",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert logs.status_code == 200
    items = logs.json()["data"]["items"]
    assert len(items) >= 1
    assert items[0]["action"] == "alert.test_send"
    assert items[0]["request_id"] == trace_id


@pytest.mark.asyncio
async def test_audit_logs_csv_export(client: AsyncClient, db_engine) -> None:
    admin_email = "export-admin@example.com"
    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    response = await client.get(
        "/api/v1/admin/audit-logs/export",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    body = response.text
    header = body.splitlines()[0]
    assert "created_at" in header
    assert "action" in header
    assert "request_id" in header


@pytest.mark.asyncio
async def test_audit_logs_filter_by_action(client: AsyncClient, db_engine) -> None:
    admin_email = "filter-admin@example.com"
    target_email = "filter-target@example.com"

    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    await client.post(
        "/api/v1/auth/register",
        json={"email": target_email, "password": "securepass123"},
    )

    listed = await client.get(
        f"/api/v1/admin/users?email={target_email}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    target_id = listed.json()["data"]["items"][0]["id"]

    await client.patch(
        f"/api/v1/admin/users/{target_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False},
    )

    await client.patch(
        "/api/v1/admin/alerts/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"recovery_notifications_enabled": True},
    )

    user_logs = await client.get(
        "/api/v1/admin/audit-logs?action=user.update",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert user_logs.status_code == 200
    user_items = user_logs.json()["data"]["items"]
    assert len(user_items) >= 1
    assert all(item["action"] == "user.update" for item in user_items)

    alert_logs = await client.get(
        "/api/v1/admin/audit-logs?action=alert.settings_update",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert alert_logs.status_code == 200
    alert_items = alert_logs.json()["data"]["items"]
    assert len(alert_items) >= 1
    assert all(item["action"] == "alert.settings_update" for item in alert_items)
