from pydantic import BaseModel


class CreatorMetricsSummary(BaseModel):
    project_created: int
    project_completed: int
    user_sessions: int
    outline_generated: int = 0
    outline_refined: int = 0
    outline_handoff: int = 0
    outline_handoff_completed: int = 0
