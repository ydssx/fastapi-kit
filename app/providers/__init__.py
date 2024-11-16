from typing import Dict, Type
from .base import BaseProvider
from .gpt4free import GPT4FreeProvider

_providers: Dict[str, Type[BaseProvider]] = {
    "gpt4free": GPT4FreeProvider,
}

def get_provider(model: str) -> BaseProvider:
    provider_class = _providers.get(model)
    if not provider_class:
        raise ValueError(f"Unknown model: {model}")
    return provider_class()
