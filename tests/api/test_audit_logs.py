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
