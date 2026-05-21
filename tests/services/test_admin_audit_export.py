import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.services.admin_audit import AdminAuditService
from app.services.audit import AuditService


@pytest.mark.asyncio
async def test_audit_export_truncates_at_max_rows(db_session: AsyncSession) -> None:
    audit = AuditService(db_session)
    for _ in range(4):
        await audit.record(
            actor_id=None,
            action="export.test",
            resource_type="system",
        )
    await db_session.commit()

    settings = Settings(
        environment="test",
        database_url="postgresql+asyncpg://unused",
        redis_url="redis://unused",
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
        admin_audit_export_max_rows=2,
    )
    service = AdminAuditService(db_session, settings)

    chunks: list[str] = []
    async for chunk in service.iter_export_rows(action="export.test"):
        chunks.append(chunk)

    body = "".join(chunks)
    assert "created_at" in body.splitlines()[0]
    assert f"# export truncated at {settings.admin_audit_export_max_rows} rows" in body
