from typing import AsyncGenerator, Any
from fastapi import HTTPException
from g4f.client import Client

class StreamService:
    def __init__(self):
        self.client = Client()

    async def process_stream(self, response) -> AsyncGenerator[str, None]:
        """处理流式响应"""
        try:
            async for chunk in response:
                if hasattr(chunk.choices[0].delta, "content"):
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Stream processing error: {str(e)}")

    async def create_stream_response(self, messages: list[dict[str, Any]], model: str) -> AsyncGenerator[str, None]:
        """创建流式响应"""
        try:
            response = await self.client.chat.completions.async_create(
                model=model,
                messages=messages,
                stream=True
            )
            async for content in self.process_stream(response):
                yield content
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Stream creation error: {str(e)}")
