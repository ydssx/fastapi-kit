from typing import AsyncGenerator, Dict, Optional, Any
from ..cache import AdvancedCache
from ..queue import RequestQueue
from ..monitoring import Metrics
from ..utils.logger import Logger
from ..models.chat import ChatRequest, ChatResponse
from ..providers import get_provider
import asyncio

class OptimizedChatService:
    def __init__(self):
        self.cache = AdvancedCache()
        self.queue = RequestQueue()
        self.metrics = Metrics()
        self.logger = Logger("chat_service")
        self.providers: Dict[str, Any] = {}
        self._response_futures: Dict[int, asyncio.Future] = {}

    async def _wait_for_response(self, task_id: int) -> str:
        future = asyncio.Future()
        self._response_futures[task_id] = future
        try:
            return await future
        finally:
            del self._response_futures[task_id]

    async def generate_response(self, request: ChatRequest) -> ChatResponse:
        # 检查缓存
        """
        生成聊天响应

        1. 检查缓存,如果存在,直接返回缓存的响应
        2. 添加到请求队列,等待响应
        3. 缓存响应

        Args:
            request (ChatRequest): 聊天请求

        Returns:
            ChatResponse: 生成的聊天响应
        """
        cached_response = await self.cache.get_cached_response(
            request.prompt,
            request.model
        )
        if cached_response:
            return ChatResponse(text=cached_response, model=request.model)

        # 添加到请求队列
        async with self.metrics.track_latency("chat_generation"):
            task_id = await self.queue.add_request(
                self._generate,
                request.prompt,
                request.model
            )
            response = await self._wait_for_response(task_id)

        # 缓存响应
        await self.cache.set_cached_response(
            request.prompt,
            request.model,
            response
        )

        return ChatResponse(text=response, model=request.model)

    async def _generate(self, prompt: str, model: str) -> str:
        """
        生成聊天响应

        Args:
            prompt (str): 用户输入的prompt
            model (str): 模型名称

        Returns:
            str: 生成的聊天响应

        Raises:
            Exception: 生成失败
        """
        try:
            provider = get_provider(model)
            response = await provider.create_async(prompt=prompt)
            return response.text
        except Exception as e:
            self.logger.error(f"Generation failed: {str(e)}")
            raise

    async def generate_stream_response(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        """
        生成流式聊天响应

        Args:
            request (ChatRequest): 聊天请求

        Yields:
            str: 生成的聊天响应 token

        Raises:
            Exception: 生成失败
        """
        async with self.metrics.track_latency("chat_stream"):
            provider = get_provider(request.model)
            async for token in provider.create_stream(prompt=request.prompt):
                yield token
