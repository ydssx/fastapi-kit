import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PipelineStepOut(BaseModel):
    key: str
    title: str
    description: str
    ai_enabled: bool


class PipelineOut(BaseModel):
    id: str
    title: str
    description: str
    steps: list[PipelineStepOut]


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
    status: str
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


class BrandProfileOut(BaseModel):
    tone: str
    audience: str
    taboos: str
    structure_notes: str


class BrandProfileUpdate(BaseModel):
    tone: str = ""
    audience: str = ""
    taboos: str = ""
    structure_notes: str = ""


class UsageOut(BaseModel):
    year_month: str
    completed_projects: int
    completed_projects_limit: int
    ai_calls: int
    ai_calls_limit: int
    playground_calls: int
    playground_calls_limit: int
    plan: str


class PlaygroundTopic(BaseModel):
    title: str = Field(max_length=200)
    reason: str = Field(max_length=500)


class PlaygroundTopicsOut(BaseModel):
    topics: list[PlaygroundTopic]
    brand_empty: bool = False


class PlaygroundMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class PlaygroundRefineIn(BaseModel):
    selected_topic: PlaygroundTopic
    messages: list[PlaygroundMessage] = Field(default_factory=list, max_length=40)


class PlaygroundRefineOut(BaseModel):
    reply: str
    understanding: str | None = None


class PlaygroundHandoffIn(BaseModel):
    pipeline_id: str
    title: str = Field(min_length=1, max_length=500)
    brief: str = Field(min_length=1, max_length=5000)
    hooks: str | None = Field(default=None, max_length=5000)
    raw_notes: str | None = Field(default=None, max_length=10000)
    target_platform_keys: list[str] = Field(min_length=1)
    primary_platform_key: str | None = None


class PlaygroundHandoffOut(BaseModel):
    project_id: uuid.UUID


class AiSuggestIn(BaseModel):
    adjustment: str | None = Field(default=None, max_length=100)


class AiSuggestOut(BaseModel):
    suggestion: str


class CreatorMetricsSummary(BaseModel):
    project_created: int
    project_completed: int
    user_sessions: int
