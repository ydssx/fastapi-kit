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
