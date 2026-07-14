"""add primary_platform_key to content projects

Revision ID: 007
Revises: 006
Create Date: 2026-06-25

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "007"
down_revision: str | None = "006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "content_projects",
        sa.Column("primary_platform_key", sa.String(length=50), nullable=True),
    )
    op.execute(
        """
        UPDATE content_projects
        SET primary_platform_key = target_platforms->>0
        WHERE jsonb_array_length(target_platforms) = 1
        """
    )


def downgrade() -> None:
    op.drop_column("content_projects", "primary_platform_key")
