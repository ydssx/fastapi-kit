"""add creator media asset metadata and project associations

Revision ID: 008
Revises: 007
Create Date: 2026-07-10

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "008"
down_revision: str | None = "007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.create_table(
        "creator_media_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("object_key", sa.String(length=1024), nullable=False),
        sa.Column("original_filename", sa.String(length=500), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("byte_size", sa.BigInteger(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column(
            "tags",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "generation_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=30), server_default="ready", nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("object_key"),
    )
    op.create_index(
        "ix_creator_media_assets_user_deleted_created",
        "creator_media_assets",
        ["user_id", "deleted_at", "created_at"],
    )
    op.create_index(
        "ix_creator_media_assets_user_category",
        "creator_media_assets",
        ["user_id", "category"],
    )
    op.create_index(
        "ix_creator_media_assets_user_status",
        "creator_media_assets",
        ["user_id", "status"],
    )
    op.create_index(
        "ix_creator_media_assets_user_original_filename",
        "creator_media_assets",
        ["user_id", "original_filename"],
    )
    op.create_index(
        "ix_creator_media_assets_original_filename_trgm",
        "creator_media_assets",
        ["original_filename"],
        postgresql_using="gin",
        postgresql_ops={"original_filename": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_creator_media_assets_tags",
        "creator_media_assets",
        ["tags"],
        postgresql_using="gin",
    )
    op.create_index(op.f("ix_creator_media_assets_user_id"), "creator_media_assets", ["user_id"])

    op.create_table(
        "project_media_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("step_key", sa.String(length=50), nullable=False),
        sa.Column("media_asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reference_position", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["media_asset_id"],
            ["creator_media_assets.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["project_id"], ["content_projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id",
            "step_key",
            "reference_position",
            name="uq_project_media_reference_position",
        ),
    )
    op.create_index(
        "ix_project_media_assets_project_step",
        "project_media_assets",
        ["project_id", "step_key"],
    )
    op.create_index(
        op.f("ix_project_media_assets_media_asset_id"),
        "project_media_assets",
        ["media_asset_id"],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_project_media_assets_media_asset_id"), table_name="project_media_assets")
    op.drop_index("ix_project_media_assets_project_step", table_name="project_media_assets")
    op.drop_table("project_media_assets")
    op.drop_index(op.f("ix_creator_media_assets_user_id"), table_name="creator_media_assets")
    op.drop_index("ix_creator_media_assets_tags", table_name="creator_media_assets")
    op.drop_index(
        "ix_creator_media_assets_original_filename_trgm",
        table_name="creator_media_assets",
    )
    op.drop_index(
        "ix_creator_media_assets_user_original_filename",
        table_name="creator_media_assets",
    )
    op.drop_index("ix_creator_media_assets_user_status", table_name="creator_media_assets")
    op.drop_index("ix_creator_media_assets_user_category", table_name="creator_media_assets")
    op.drop_index("ix_creator_media_assets_user_deleted_created", table_name="creator_media_assets")
    op.drop_table("creator_media_assets")
