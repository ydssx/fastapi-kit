"""add request_id to audit_logs

Revision ID: 004
Revises: 003
Create Date: 2026-05-20

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "audit_logs",
        sa.Column("request_id", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("audit_logs", "request_id")
