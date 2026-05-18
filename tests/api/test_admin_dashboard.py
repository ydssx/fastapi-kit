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
async def test_admin_dashboard(client: AsyncClient, db_engine) -> None:
    admin_email = "dash-admin@example.com"
    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    response = await client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["user_count"] >= 1
    assert data["service_status"]["database"] == "ok"
    assert data["service_status"]["redis"] == "ok"

    metrics = await client.get(
        "/api/v1/admin/metrics/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert metrics.status_code == 200
    assert isinstance(metrics.json()["data"], dict)
