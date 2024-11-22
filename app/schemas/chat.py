from pydantic import BaseModel
from typing import List, Optional


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = "claude-3.5-sonnet"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    stream: Optional[bool] = False


class ChatResponse(BaseModel):
    message: ChatMessage
    usage: Optional[dict] = None


class ChatStreamResponse(BaseModel):
    content: str
    role: str = "assistant"
    finish_reason: Optional[str] = None
