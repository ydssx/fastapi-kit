import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ProjectStatus = Literal["in_progress", "completed"]


class ProjectCreate(BaseModel):
    pipeline_id: str
    title: str = Field(min_length=1, max_length=500)
    target_platform_keys: list[str] = Field(default_factory=list)
    primary_platform_key: str | None = None


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    target_platform_keys: list[str] | None = None
    primary_platform_key: str | None = None


class PublishProgressOut(BaseModel):
    platforms_total: int
    platforms_published: int
    summary_label: str


class StepDraftUpdate(BaseModel):
    content: str


class PublishChecklistItemOut(BaseModel):
    platform: str
    platform_label: str
    item_key: str
    label: str
    checked: bool = False


class PublishChecklistUpdate(BaseModel):
    checked_keys: list[str] = Field(
        description="Keys formatted as platform:item_key",
        default_factory=list,
    )


class StepArtifactOut(BaseModel):
    step_key: str
    content: str
    version: int
    confirmed_at: datetime


class ProjectOut(BaseModel):
    id: uuid.UUID
    pipeline_id: str
    title: str
    status: ProjectStatus
    current_step_key: str
    target_platforms: list[str]
    primary_platform_key: str | None = None
    draft_content: dict[str, str]
    publish_checklist_state: dict[str, bool]
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    artifacts: list[StepArtifactOut] = Field(default_factory=list)
    publish_progress: PublishProgressOut | None = None
