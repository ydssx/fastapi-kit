import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.roles import ALL_ROLES


class UserAdmin(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    is_active: bool
    role: str
    created_at: datetime


class UserUpdate(BaseModel):
    is_active: bool | None = None
    role: str | None = Field(default=None)

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str | None) -> str | None:
        if value is not None and value not in ALL_ROLES:
            raise ValueError(f"role must be one of: {', '.join(sorted(ALL_ROLES))}")
        return value


class ServiceStatus(BaseModel):
    database: str
    redis: str


class SystemOverview(BaseModel):
    ready_status: str
    ready_message: str | None = None
    migration_at_head: bool
    migration_revision: str | None = None
    migration_head_revision: str | None = None
    beat_status: str
    beat_last_seen: datetime | None = None
    api_replicas_reported: int | None = None
    api_replicas_note: str | None = None


class DashboardStats(BaseModel):
    user_count: int
    active_user_count: int
    service_status: ServiceStatus
    metrics_summary: dict[str, float]
    system: SystemOverview


class PasswordResetResult(BaseModel):
    temporary_password: str


class CeleryWorkerInfo(BaseModel):
    name: str
    status: str
    active_tasks: int
    processed: int | None = None


class CeleryTaskInfo(BaseModel):
    worker: str
    task_id: str
    name: str
    args: list[Any] = Field(default_factory=list)


class BeatScheduleEntry(BaseModel):
    name: str
    task: str
    schedule: str


class CeleryOverview(BaseModel):
    status: str
    workers: list[CeleryWorkerInfo]
    active_tasks: list[CeleryTaskInfo]
    scheduled_tasks: list[CeleryTaskInfo]
    reserved_tasks: list[CeleryTaskInfo] = Field(default_factory=list)
    beat_schedule: list[BeatScheduleEntry] = Field(default_factory=list)
    flower_url: str | None = None
    message: str | None = None


class AuditLogPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_id: uuid.UUID | None
    action: str
    resource_type: str
    resource_id: str | None
    detail: dict[str, Any] | None
    ip: str | None
    user_agent: str | None
    request_id: str | None = None
    created_at: datetime
