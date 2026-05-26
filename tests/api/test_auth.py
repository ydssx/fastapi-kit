import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_flow(client: AsyncClient) -> None:
    email = "user@example.com"
    password = "securepass123"

    register = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert register.status_code == 201
    register_body = register.json()
    assert register_body["code"] == 0
    access_token = register_body["data"]["tokens"]["access_token"]
    refresh_token = register_body["data"]["tokens"]["refresh_token"]

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me.status_code == 200
    assert me.json()["data"]["email"] == email

    refresh = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh.status_code == 200
    new_access = refresh.json()["data"]["access_token"]
    assert new_access

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login.status_code == 200
    assert login.json()["data"]["tokens"]["access_token"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient) -> None:
    payload = {"email": "dup@example.com", "password": "securepass123"}
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_login_rejects_inactive_user(client: AsyncClient, db_engine) -> None:
    from sqlalchemy.ext.asyncio import async_sessionmaker

    from app.repositories.user import UserRepository

    email = "inactive@example.com"
    password = "securepass123"
    register = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert register.status_code == 201

    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        user = await repo.get_by_email(email)
        assert user is not None
        await repo.update_fields(user, is_active=False)
        await session.commit()

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login.status_code == 403
    assert login.json()["code"] == 40102


@pytest.mark.asyncio
async def test_refresh_rejects_access_token(client: AsyncClient) -> None:
    register = await client.post(
        "/api/v1/auth/register",
        json={"email": "refresh-type@example.com", "password": "securepass123"},
    )
    assert register.status_code == 201
    access_token = register.json()["data"]["tokens"]["access_token"]

    refresh = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access_token},
    )
    assert refresh.status_code == 401
    assert refresh.json()["code"] == 40103
