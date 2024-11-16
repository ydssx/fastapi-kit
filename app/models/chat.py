from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    prompt: str
    model: str = "you"
    stream: bool = False

class ChatResponse(BaseModel):
    text: str
    model: str
