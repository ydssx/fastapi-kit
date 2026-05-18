from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def _alembic_head_revision() -> str | None:
    root = Path(__file__).resolve().parents[2]
    config = Config(str(root / "alembic.ini"))
    script = ScriptDirectory.from_config(config)
    return script.get_current_head()


async def get_migration_status(session: AsyncSession) -> tuple[bool, str | None, str | None]:
    head = _alembic_head_revision()
    try:
        result = await session.execute(text("SELECT version_num FROM alembic_version"))
        current = result.scalar_one_or_none()
    except Exception:
        return False, None, head
    at_head = current is not None and head is not None and current == head
    return at_head, current, head
