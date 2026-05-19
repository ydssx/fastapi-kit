from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class LogEntryPublic(BaseModel):
    timestamp: datetime
    level: str | None = None
    message: str | None = None
    request_id: str | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


class LogQueryResult(BaseModel):
    items: list[LogEntryPublic]
    total: int
    page: int
    page_size: int
    loki_available: bool = True
