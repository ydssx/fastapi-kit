from pydantic import BaseModel


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
