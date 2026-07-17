from typing import Literal

from pydantic import BaseModel, Field


class AiSuggestIn(BaseModel):
    adjustment: str | None = Field(default=None, max_length=100)
    mode: Literal["selection"] | None = Field(default=None)
    selected_text: str | None = Field(default=None, max_length=2000)


class AiVariantOut(BaseModel):
    label: str
    content: str


class AiSuggestOut(BaseModel):
    suggestion: str
    variants: list[AiVariantOut] = Field(default_factory=list)
