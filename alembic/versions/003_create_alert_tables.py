"""create alert_settings and alert_deliveries tables

Revision ID: 003
Revises: 002
Create Date: 2026-05-18

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "alert_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("webhook_url", sa.Text(), nullable=True),
        sa.Column("webhook_secret", sa.Text(), nullable=True),
        sa.Column(
            "recovery_notifications_enabled",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        sa.text(
            "INSERT INTO alert_settings (id, recovery_notifications_enabled) VALUES (1, true)"
        )
    )

    op.create_table(
        "alert_deliveries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("http_status", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_alert_deliveries_created_at"),
        "alert_deliveries",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_alert_deliveries_event_type"),
        "alert_deliveries",
        ["event_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_alert_deliveries_event_type"), table_name="alert_deliveries")
    op.drop_index(op.f("ix_alert_deliveries_created_at"), table_name="alert_deliveries")
    op.drop_table("alert_deliveries")
    op.drop_table("alert_settings")
