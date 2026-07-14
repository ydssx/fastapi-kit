"""add playground_calls to creator usage counters

Revision ID: 006
Revises: 005
Create Date: 2026-06-25

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "creator_usage_counters",
        sa.Column("playground_calls", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("creator_usage_counters", "playground_calls")
