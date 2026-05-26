import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.migration_status import _alembic_head_revision, get_migration_status


@pytest.mark.asyncio
async def test_migration_status_without_alembic_table(db_session: AsyncSession) -> None:
    await db_session.execute(text("DROP TABLE IF EXISTS alembic_version"))
    await db_session.commit()

    at_head, current, head = await get_migration_status(db_session)
    assert at_head is False
    assert current is None
    assert head is not None


@pytest.mark.asyncio
async def test_migration_status_at_head_when_revision_matches(db_session: AsyncSession) -> None:
    head = _alembic_head_revision()
    assert head is not None

    await db_session.execute(
        text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)")
    )
    await db_session.execute(text("DELETE FROM alembic_version"))
    await db_session.execute(
        text("INSERT INTO alembic_version (version_num) VALUES (:rev)"),
        {"rev": head},
    )
    await db_session.commit()

    at_head, current, reported_head = await get_migration_status(db_session)
    assert at_head is True
    assert current == head
    assert reported_head == head

    await db_session.execute(text("DROP TABLE IF EXISTS alembic_version"))
    await db_session.commit()


@pytest.mark.asyncio
async def test_migration_status_not_at_head_when_revision_differs(db_session: AsyncSession) -> None:
    head = _alembic_head_revision()
    assert head is not None

    await db_session.execute(
        text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)")
    )
    await db_session.execute(text("DELETE FROM alembic_version"))
    await db_session.execute(
        text("INSERT INTO alembic_version (version_num) VALUES ('stale-revision')")
    )
    await db_session.commit()

    at_head, current, reported_head = await get_migration_status(db_session)
    assert at_head is False
    assert current == "stale-revision"
    assert reported_head == head

    await db_session.execute(text("DROP TABLE IF EXISTS alembic_version"))
    await db_session.commit()
