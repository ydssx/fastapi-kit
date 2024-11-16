from abc import ABC, abstractmethod
from typing import AsyncGenerator

class BaseProvider(ABC):
    @abstractmethod
    async def create_async(self, prompt: str) -> str:
        pass

    @abstractmethod
    async def create_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        pass
