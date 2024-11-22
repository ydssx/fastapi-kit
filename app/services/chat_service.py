from g4f.client import Client
from typing import List, Dict, Any, AsyncGenerator
from app.core.config import settings
from app.schemas.chat import ChatMessage, ChatRequest, ChatResponse, ChatStreamResponse


class ChatService:
    def __init__(self):
        self.client = Client()

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """
        Send a chat completion request to OpenAI API
        """
        try:
            response = await self.client.chat_completion.create(
                model=request.model,
                messages=[
                    {"role": msg.role, "content": msg.content}
                    for msg in request.messages
                ],
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                stream=request.stream,
            )

            if request.stream:
                raise ValueError("For streaming responses, use chat_completion_stream instead")

            # Extract the assistant's message from the response
            message = ChatMessage(
                role="assistant", content=response.choices[0].message.content
            )

            return ChatResponse(message=message, usage=response.usage)

        except Exception as e:
            # Log the error and raise it
            raise Exception(f"Error in chat completion: {str(e)}")

    async def chat_completion_stream(
        self, request: ChatRequest
    ) -> AsyncGenerator[ChatStreamResponse, None]:
        """
        Stream chat completion responses from OpenAI API
        """
        try:
            response = await self.client.chat.completions.async_create(
                model=request.model,
                messages=[
                    {"role": msg.role, "content": msg.content}
                    for msg in request.messages
                ],
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                stream=True,
            )

            async for chunk in response:
                if chunk and chunk.choices and chunk.choices[0].delta.get("content"):
                    yield ChatStreamResponse(
                        content=chunk.choices[0].delta.content,
                        finish_reason=chunk.choices[0].finish_reason,
                    )

        except Exception as e:
            # Log the error and raise it
            raise Exception(f"Error in chat completion stream: {str(e)}")


chat_service = ChatService()
