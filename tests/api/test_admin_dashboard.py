from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.cache.redis import get_redis_client
from app.core.celery_keys import BEAT_HEARTBEAT_REDIS_KEY
from app.repositories.user import UserRepository
from app.services.migration_status import _alembic_head_revision


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
    assert "system" in data
    assert "ready_status" in data["system"]
    assert "beat_status" in data["system"]

    metrics = await client.get(
        "/api/v1/admin/metrics/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert metrics.status_code == 200
    assert isinstance(metrics.json()["data"], dict)


@pytest.mark.asyncio
async def test_admin_dashboard_ready_degraded_when_migration_not_at_head(
    client: AsyncClient,
    db_engine,
) -> None:
    admin_email = "dash-migrate@example.com"
    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    head = _alembic_head_revision()
    assert head is not None

    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        await session.execute(
            text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)")
        )
        await session.execute(text("DELETE FROM alembic_version"))
        await session.execute(
            text("INSERT INTO alembic_version (version_num) VALUES ('stale-revision')")
        )
        await session.commit()

    response = await client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    system = response.json()["data"]["system"]
    assert system["migration_at_head"] is False
    assert system["ready_status"] == "degraded"
    assert "migration" in (system["ready_message"] or "").lower()


@pytest.mark.asyncio
async def test_admin_dashboard_ready_degraded_when_beat_stale(
    client: AsyncClient,
    db_engine,
    test_settings,
) -> None:
    admin_email = "dash-beat@example.com"
    admin_token = await _register(client, admin_email)
    await _make_admin(db_engine, admin_email)

    head = _alembic_head_revision()
    assert head is not None
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        await session.execute(
            text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)")
        )
        await session.execute(text("DELETE FROM alembic_version"))
        await session.execute(
            text("INSERT INTO alembic_version (version_num) VALUES (:rev)"),
            {"rev": head},
        )
        await session.commit()

    stale = datetime.now(UTC) - timedelta(
        seconds=test_settings.celery_beat_heartbeat_interval_seconds * 3
    )
    redis = get_redis_client()
    await redis.set(BEAT_HEARTBEAT_REDIS_KEY, stale.isoformat())

    response = await client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    system = response.json()["data"]["system"]
    assert system["beat_status"] == "stale"
    assert system["ready_status"] == "degraded"
    assert "beat" in (system["ready_message"] or "").lower()
