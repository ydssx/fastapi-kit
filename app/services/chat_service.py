from gpt4free import you, Provider
from ..models.chat import ChatRequest, ChatResponse
import asyncio

class ChatService:
    def __init__(self):
        self.providers = {
            "you": you.Completion,
            "deepai": Provider.DeepAI,
        }

    async def generate_response(self, request: ChatRequest) -> ChatResponse:
        provider = self.providers.get(request.model)
        if not provider:
            raise ValueError(f"Unsupported model: {request.model}")

        response = await self._safe_generate(provider, request.prompt)
        return ChatResponse(text=response, model=request.model)

    async def _safe_generate(self, provider, prompt: str) -> str:
        try:
            response = await asyncio.to_thread(
                provider.create,
                prompt=prompt
            )
            return response.text
        except Exception as e:
            raise Exception(f"Generation failed: {str(e)}")
