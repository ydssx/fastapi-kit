from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = Field(default=0, description="Business status code, 0 means success")
    message: str = "ok"
    data: T | None = None


class HealthData(BaseModel):
    status: str


class ReadyData(BaseModel):
    status: str
    database: str
    redis: str
