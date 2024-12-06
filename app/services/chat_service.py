from typing import AsyncGenerator

from langchain_core.messages import AIMessage, HumanMessage
from langchain_ollama import ChatOllama

from app.schemas.chat import (ChatMessage, ChatRequest, ChatResponse,
                              ChatStreamResponse)


class ChatService:
    def __init__(self):
        self.client = ChatOllama(
            model="llama3.2:3b",  # 可以根据需要修改模型名称
            base_url="http://localhost:11434",  # Ollama默认地址
        )

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """
        使用Langchain和Ollama进行聊天完成
        """
        try:
            # 将消息转换为Langchain格式
            messages = []
            for msg in request.messages:
                if msg.role == "user":
                    messages.append(HumanMessage(content=msg.content))
                elif msg.role == "assistant":
                    messages.append(AIMessage(content=msg.content))

            # 调用Ollama进行对话
            response = await self.client.ainvoke(messages)

            # 构造返回消息
            message = ChatMessage(
                role="assistant",
                content=response.content
            )

            # 由于Ollama不提供token统计，这里返回None
            return ChatResponse(message=message, usage=None)

        except Exception as e:
            raise Exception(f"聊天完成时出错: {str(e)}")

    async def chat_completion_stream(
        self, request: ChatRequest
    ) -> AsyncGenerator[ChatStreamResponse, None]:
        """
        流式返回Ollama的聊天响应
        """
        try:
            messages = []
            for msg in request.messages:
                if msg.role == "user":
                    messages.append(HumanMessage(content=msg.content))
                elif msg.role == "assistant":
                    messages.append(AIMessage(content=msg.content))

            # 使用Langchain的流式接口
            async for chunk in self.client.astream(messages):
                if chunk.content:
                    print(chunk.content)
                    yield ChatStreamResponse(
                        content=chunk.content,
                        finish_reason=None  # Ollama不提供finish_reason
                    )

        except Exception as e:
            raise Exception(f"流式聊天完成时出错: {str(e)}")


chat_service = ChatService()
