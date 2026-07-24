from pydantic import BaseModel


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
