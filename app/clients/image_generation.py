import base64
from dataclasses import dataclass

import httpx

from app.core.config import Settings
from app.core.exceptions import AppException


@dataclass(frozen=True)
class GeneratedImage:
    content: bytes
    media_type: str


class ImageGenerationClient:
    """OpenAI Images API client that returns generated image bytes."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def generate(self, prompt: str, *, size: str = "1024x1024") -> GeneratedImage:
        if not self._settings.image_generation_api_key:
            raise AppException(
                "Image generation is not configured",
                code=50320,
                status_code=503,
            )
        if not prompt.strip() or len(prompt) > self._settings.image_generation_max_prompt_chars:
            raise AppException("Invalid image generation prompt", code=42220, status_code=422)

        url = f"{self._settings.image_generation_base_url.rstrip('/')}/images/generations"
        headers = {
            "Authorization": f"Bearer {self._settings.image_generation_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._settings.image_generation_model,
            "prompt": prompt,
            "size": size,
            "response_format": "b64_json",
        }
        try:
            async with httpx.AsyncClient(
                timeout=self._settings.image_generation_timeout_seconds
            ) as client:
                response = await client.post(url, headers=headers, json=payload)
        except httpx.HTTPError as exc:
            raise AppException(
                "Image generation provider request failed",
                code=50321,
                status_code=503,
            ) from exc

        if response.status_code >= 400:
            raise AppException(
                "Image generation provider request failed",
                code=50321,
                status_code=503,
                data={"status": response.status_code},
            )
        try:
            encoded_image = response.json()["data"][0]["b64_json"]
            return GeneratedImage(
                content=base64.b64decode(encoded_image, validate=True),
                media_type="image/png",
            )
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise AppException(
                "Invalid image generation provider response",
                code=50322,
                status_code=503,
            ) from exc
