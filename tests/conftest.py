import os
from collections.abc import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.cache.redis import close_redis_pool, init_redis_pool
from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.main import create_app
from app.models import Base
from app.services.migration_status import _alembic_head_revision

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-jwt-signing-32chars")


def _docker_available() -> bool:
    try:
        import docker

        docker.from_env().ping()
        return True
    except Exception:
        return False


@pytest.fixture(scope="session")
def postgres_url() -> Generator[str, None, None]:
    env_url = os.environ.get("TEST_DATABASE_URL")
    if env_url:
        yield env_url
        return

    if not _docker_available():
        pytest.skip("Docker is unavailable. Set TEST_DATABASE_URL or start Docker.")

    from testcontainers.postgres import PostgresContainer

    with PostgresContainer("postgres:16-alpine") as postgres:
        url = postgres.get_connection_url().replace("psycopg2", "asyncpg")
        yield url


@pytest.fixture(scope="session")
def redis_url() -> Generator[str, None, None]:
    env_url = os.environ.get("TEST_REDIS_URL")
    if env_url:
        yield env_url
        return

    if not _docker_available():
        pytest.skip("Docker is unavailable. Set TEST_REDIS_URL or start Docker.")

    from testcontainers.redis import RedisContainer

    with RedisContainer("redis:7-alpine") as redis:
        yield f"redis://{redis.get_container_host_ip()}:{redis.get_exposed_port(6379)}/0"


@pytest.fixture(scope="session")
def test_settings(postgres_url: str, redis_url: str) -> Settings:
    return Settings(
        environment="test",
        database_url=postgres_url,
        redis_url=redis_url,
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
        rate_limit_per_minute=1000,
        llm_api_key=None,
    )


@pytest_asyncio.fixture
async def db_engine(test_settings: Settings):
    engine = create_async_engine(test_settings.database_url_str, pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        head = _alembic_head_revision()
        if head is not None:
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS alembic_version "
                    "(version_num VARCHAR(32) NOT NULL)"
                )
            )
            await conn.execute(text("DELETE FROM alembic_version"))
            await conn.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:rev)"),
                {"rev": head},
            )
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture(autouse=True)
def mock_celery_task(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.tasks.example.send_notification.delay",
        lambda *_args, **_kwargs: None,
    )


@pytest_asyncio.fixture
async def client(
    test_settings: Settings, db_engine, monkeypatch: pytest.MonkeyPatch
) -> AsyncGenerator[AsyncClient, None]:
    get_settings.cache_clear()
    app = create_app()

    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_db] = override_get_db

    import app.core.config as config_module

    config_module.get_settings.cache_clear()
    monkeypatch.setattr(config_module, "get_settings", lambda: test_settings)

    # Modules that bind get_settings at import time must be patched separately.
    for module_path in (
        "app.middleware.rate_limit",
        "app.services.creator_ai",
        "app.services.creator_playground",
        "app.services.creator_usage",
    ):
        monkeypatch.setattr(f"{module_path}.get_settings", lambda: test_settings)

    await init_redis_pool(test_settings)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    await close_redis_pool()
    get_settings.cache_clear()
    app.dependency_overrides.clear()
