from pydantic import BaseModel, Field


class AiSuggestIn(BaseModel):
    adjustment: str | None = Field(default=None, max_length=100)


class AiVariantOut(BaseModel):
    label: str
    content: str


class AiSuggestOut(BaseModel):
    suggestion: str
    variants: list[AiVariantOut] = Field(default_factory=list)
