from pydantic import BaseModel


class UsageOut(BaseModel):
    year_month: str
    completed_projects: int
    completed_projects_limit: int
    ai_calls: int
    ai_calls_limit: int
    playground_calls: int
    playground_calls_limit: int
    plan: str
