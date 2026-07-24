import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

MediaAssetStatus = Literal["processing", "ready", "failed", "deleted"]


class CreatorMediaImportIn(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    filename: str = Field(min_length=1, max_length=500)
    category: str = Field(min_length=1, max_length=50)
    tags: list[str] = Field(default_factory=list, max_length=20)


class CreatorImageGenerationIn(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    category: str = Field(min_length=1, max_length=50)
    tags: list[str] = Field(default_factory=list, max_length=20)
    size: Literal["1024x1024", "1024x1536", "1536x1024"] = "1024x1024"


class CreatorMediaAssetOut(BaseModel):
    id: uuid.UUID
    original_filename: str
    mime_type: str
    byte_size: int
    width: int | None
    height: int | None
    source: str
    category: str
    tags: list[str]
    status: MediaAssetStatus
    created_at: datetime


class CreatorMediaAssetUpdate(BaseModel):
    filename: str | None = Field(default=None, min_length=1, max_length=500)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    tags: list[str] | None = Field(default=None, max_length=20)


class CreatorMediaAssetListOut(BaseModel):
    items: list[CreatorMediaAssetOut]
    total: int
    page: int
    page_size: int


class CreatorMediaAssociationCreate(BaseModel):
    project_id: uuid.UUID
    step_key: str = Field(min_length=1, max_length=50)
    reference_position: str = Field(min_length=1, max_length=255)


class CreatorMediaAssociationOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    media_asset_id: uuid.UUID
    step_key: str
    reference_position: str
    asset_reference: str
    created_at: datetime


class CreatorProjectMediaAssociationOut(CreatorMediaAssociationOut):
    asset: CreatorMediaAssetOut
    is_invalid: bool


class CreatorMediaPreviewOut(BaseModel):
    url: str
