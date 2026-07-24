import uuid

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CreatorUsageCounter(Base):
    __tablename__ = "creator_usage_counters"
    __table_args__ = (UniqueConstraint("user_id", "year_month", name="uq_usage_user_month"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    year_month: Mapped[str] = mapped_column(String(7), nullable=False)
    completed_projects: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ai_calls: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    playground_calls: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
