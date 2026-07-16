import uuid
from typing import Literal

from pydantic import BaseModel, Field


class PlaygroundTopic(BaseModel):
    title: str = Field(max_length=200)
    reason: str = Field(max_length=500)


class PlaygroundTopicsIn(BaseModel):
    seed: str | None = Field(default=None, max_length=500)


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


class PlaygroundOutlineSection(BaseModel):
    title: str = Field(max_length=200)
    summary: str = Field(max_length=1000)


class PlaygroundOutline(BaseModel):
    central_claim: str = Field(max_length=500)
    opening_hook: str = Field(max_length=2000)
    sections: list[PlaygroundOutlineSection] = Field(min_length=3, max_length=5)
    closing_cta: str = Field(max_length=2000)


class PlaygroundOutlineGenerateIn(BaseModel):
    selected_topic: PlaygroundTopic


class PlaygroundOutlineGenerateOut(BaseModel):
    outline: PlaygroundOutline
    brand_empty: bool = False


class PlaygroundOutlineRefineIn(BaseModel):
    selected_topic: PlaygroundTopic
    outline: PlaygroundOutline
    messages: list[PlaygroundMessage] = Field(default_factory=list, max_length=40)


class PlaygroundOutlineRefineOut(BaseModel):
    outline: PlaygroundOutline


class PlaygroundHandoffIn(BaseModel):
    pipeline_id: str
    title: str = Field(min_length=1, max_length=500)
    brief: str = Field(min_length=1, max_length=5000)
    hooks: str | None = Field(default=None, max_length=5000)
    outline: PlaygroundOutline | None = None
    raw_notes: str | None = Field(default=None, max_length=10000)
    target_platform_keys: list[str] = Field(min_length=1)
    primary_platform_key: str | None = None


class PlaygroundHandoffOut(BaseModel):
    project_id: uuid.UUID
