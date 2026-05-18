from unittest.mock import MagicMock, patch

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
async def test_admin_celery_overview(client: AsyncClient, db_engine) -> None:
    admin_email = "celery-admin@example.com"
    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    mock_inspector = MagicMock()
    mock_inspector.stats.return_value = {
        "celery@worker1": {"total": {"app.tasks.example.send_notification": 3}},
    }
    mock_inspector.active.return_value = {
        "celery@worker1": [
            {"id": "task-1", "name": "app.tasks.example.send_notification", "args": []},
        ],
    }
    mock_inspector.scheduled.return_value = {}
    mock_inspector.reserved.return_value = {}

    with (
        patch(
            "app.services.admin_celery.celery_app.control.ping",
            return_value=[{"celery@worker1": {"ok": "pong"}}],
        ),
        patch("app.services.admin_celery.celery_app.control.inspect", return_value=mock_inspector),
    ):
        response = await client.get(
            "/api/v1/admin/celery/overview",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "ok"
    assert len(data["workers"]) == 1
    assert len(data["active_tasks"]) == 1
    assert len(data["beat_schedule"]) >= 1
