from typing import Any

import httpx

from app.core.config import Settings
from app.core.exceptions import AppException

# OpenAI-compatible chat completions JSON mode.
JSON_OBJECT_RESPONSE_FORMAT: dict[str, str] = {"type": "json_object"}


class LlmClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def complete(
        self,
        system: str,
        user: str,
        *,
        json_output: bool = False,
    ) -> str:
        if not self.settings.llm_api_key:
            raise AppException(
                "AI is not configured (set LLM_API_KEY)",
                code=50301,
                status_code=503,
            )
        base = self.settings.llm_base_url.rstrip("/")
        url = f"{base}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.settings.llm_api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.settings.llm_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.7,
        }
        if json_output and self.settings.llm_json_output:
            payload["response_format"] = JSON_OBJECT_RESPONSE_FORMAT
        async with httpx.AsyncClient(timeout=self.settings.llm_timeout_seconds) as client:
            response = await client.post(url, headers=headers, json=payload)
        if response.status_code >= 400:
            raise AppException(
                "AI provider request failed",
                code=50302,
                status_code=503,
                data={"status": response.status_code},
            )
        data = response.json()
        try:
            return str(data["choices"][0]["message"]["content"]).strip()
        except (KeyError, IndexError, TypeError) as exc:
            raise AppException("Invalid AI provider response", code=50303, status_code=503) from exc
