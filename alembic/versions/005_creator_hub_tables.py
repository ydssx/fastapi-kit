"""creator hub tables and user plan

Revision ID: 005
Revises: 004
Create Date: 2026-05-22

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("plan", sa.String(length=20), server_default="free", nullable=False),
    )

    op.create_table(
        "content_projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pipeline_id", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=30), server_default="in_progress", nullable=False),
        sa.Column("current_step_key", sa.String(length=50), nullable=False),
        sa.Column(
            "target_platforms",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
        sa.Column(
            "draft_content",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column(
            "publish_checklist_state",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_content_projects_user_id"), "content_projects", ["user_id"])

    op.create_table(
        "project_step_artifacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("step_key", sa.String(length=50), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column(
            "confirmed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["content_projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id", "step_key", "version", name="uq_project_step_version"
        ),
    )
    op.create_index(
        op.f("ix_project_step_artifacts_project_id"),
        "project_step_artifacts",
        ["project_id"],
    )

    op.create_table(
        "creator_brand_profiles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tone", sa.Text(), server_default="", nullable=False),
        sa.Column("audience", sa.Text(), server_default="", nullable=False),
        sa.Column("taboos", sa.Text(), server_default="", nullable=False),
        sa.Column("structure_notes", sa.Text(), server_default="", nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )

    op.create_table(
        "creator_usage_counters",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("year_month", sa.String(length=7), nullable=False),
        sa.Column("completed_projects", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ai_calls", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "year_month", name="uq_usage_user_month"),
    )
    op.create_index(
        op.f("ix_creator_usage_counters_user_id"), "creator_usage_counters", ["user_id"]
    )

    op.create_table(
        "creator_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["content_projects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_creator_events_user_id"), "creator_events", ["user_id"])
    op.create_index(op.f("ix_creator_events_event_type"), "creator_events", ["event_type"])


def downgrade() -> None:
    op.drop_index(op.f("ix_creator_events_event_type"), table_name="creator_events")
    op.drop_index(op.f("ix_creator_events_user_id"), table_name="creator_events")
    op.drop_table("creator_events")
    op.drop_index(op.f("ix_creator_usage_counters_user_id"), table_name="creator_usage_counters")
    op.drop_table("creator_usage_counters")
    op.drop_table("creator_brand_profiles")
    op.drop_index(
        op.f("ix_project_step_artifacts_project_id"), table_name="project_step_artifacts"
    )
    op.drop_table("project_step_artifacts")
    op.drop_index(op.f("ix_content_projects_user_id"), table_name="content_projects")
    op.drop_table("content_projects")
    op.drop_column("users", "plan")
