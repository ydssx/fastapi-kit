import uuid

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
async def test_admin_users_forbidden_for_regular_user(
    client: AsyncClient,
) -> None:
    token = await _register(client, "regular@example.com")
    response = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == 40301


@pytest.mark.asyncio
async def test_admin_users_list_and_update(client: AsyncClient, db_engine) -> None:
    admin_email = "admin@example.com"
    user_email = "managed@example.com"

    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    await client.post(
        "/api/v1/auth/register",
        json={"email": user_email, "password": "securepass123"},
    )

    listed = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert listed.status_code == 200
    body = listed.json()
    assert body["code"] == 0
    assert body["data"]["total"] >= 2

    target = next(item for item in body["data"]["items"] if item["email"] == user_email)

    updated = await client.patch(
        f"/api/v1/admin/users/{target['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False, "role": "user"},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["is_active"] is False


@pytest.mark.asyncio
async def test_admin_cannot_deactivate_self(client: AsyncClient, db_engine) -> None:
    admin_email = "self@example.com"
    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    admin_id = me.json()["data"]["id"]

    response = await client.patch(
        f"/api/v1/admin/users/{admin_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False},
    )
    assert response.status_code == 400
    assert response.json()["code"] == 40003


@pytest.mark.asyncio
async def test_admin_cannot_remove_last_active_admin(client: AsyncClient, db_engine) -> None:
    admin_email = "sole-admin@example.com"
    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    other_email = "other-admin@example.com"
    await _register(client, other_email)
    await _make_admin(db_engine, other_email)

    sole_id = me.json()["data"]["id"]
    other_list = await client.get(
        "/api/v1/admin/users?email=other-admin",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    other_id = other_list.json()["data"]["items"][0]["id"]

    await client.patch(
        f"/api/v1/admin/users/{other_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False},
    )

    response = await client.patch(
        f"/api/v1/admin/users/{sole_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "user"},
    )
    assert response.status_code == 400
    assert response.json()["code"] == 40004


@pytest.mark.asyncio
async def test_admin_can_demote_when_two_active_admins(client: AsyncClient, db_engine) -> None:
    admin_email = "keeper@example.com"
    target_email = "other-admin@example.com"

    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)
    await _register(client, target_email)
    await _make_admin(db_engine, target_email)

    target_list = await client.get(
        f"/api/v1/admin/users?email={target_email}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    target_id = target_list.json()["data"]["items"][0]["id"]

    response = await client.patch(
        f"/api/v1/admin/users/{target_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "user"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["role"] == "user"


@pytest.mark.asyncio
async def test_admin_reset_password_and_login(client: AsyncClient, db_engine) -> None:
    admin_email = "reset-admin@example.com"
    target_email = "reset-target@example.com"

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

    reset = await client.post(
        f"/api/v1/admin/users/{target_id}/reset-password",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert reset.status_code == 200
    temp_password = reset.json()["data"]["temporary_password"]
    assert len(temp_password) >= 8

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": target_email, "password": temp_password},
    )
    assert login.status_code == 200

    audits = await client.get(
        f"/api/v1/admin/users/{target_id}/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert audits.status_code == 200
    assert any(item["action"] == "user.reset_password" for item in audits.json()["data"])


@pytest.mark.asyncio
async def test_admin_get_user_not_found(client: AsyncClient, db_engine) -> None:
    admin_email = "lookup-admin@example.com"
    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    missing_id = uuid.uuid4()
    response = await client.get(
        f"/api/v1/admin/users/{missing_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404
    assert response.json()["code"] == 40401


@pytest.mark.asyncio
async def test_admin_update_user_empty_payload_is_noop(
    client: AsyncClient,
    db_engine,
) -> None:
    admin_email = "noop-admin@example.com"
    target_email = "noop-target@example.com"

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
    target = listed.json()["data"]["items"][0]
    original_role = target["role"]
    original_active = target["is_active"]

    response = await client.patch(
        f"/api/v1/admin/users/{target['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["role"] == original_role
    assert data["is_active"] is original_active


@pytest.mark.asyncio
async def test_cannot_remove_last_active_admin_when_demoting_other(
    client: AsyncClient,
    db_engine,
) -> None:
    """When only one active admin remains, demoting another inactive admin must not drop below one."""
    keeper_email = "keeper-last@example.com"
    inactive_admin_email = "inactive-admin@example.com"

    keeper_token = await _register(client, keeper_email)
    await _make_admin(db_engine, keeper_email)

    await _register(client, inactive_admin_email)
    await _make_admin(db_engine, inactive_admin_email)

    inactive_list = await client.get(
        f"/api/v1/admin/users?email={inactive_admin_email}",
        headers={"Authorization": f"Bearer {keeper_token}"},
    )
    inactive_id = inactive_list.json()["data"]["items"][0]["id"]

    deactivate = await client.patch(
        f"/api/v1/admin/users/{inactive_id}",
        headers={"Authorization": f"Bearer {keeper_token}"},
        json={"is_active": False},
    )
    assert deactivate.status_code == 200

    demote = await client.patch(
        f"/api/v1/admin/users/{inactive_id}",
        headers={"Authorization": f"Bearer {keeper_token}"},
        json={"role": "user"},
    )
    assert demote.status_code == 200
    assert demote.json()["data"]["role"] == "user"

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {keeper_token}"},
    )
    keeper_id = me.json()["data"]["id"]

    block_self = await client.patch(
        f"/api/v1/admin/users/{keeper_id}",
        headers={"Authorization": f"Bearer {keeper_token}"},
        json={"role": "user"},
    )
    assert block_self.status_code == 400
    assert block_self.json()["code"] == 40004
