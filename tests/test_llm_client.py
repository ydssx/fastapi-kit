from typing import Any

import httpx
import pytest

from app.clients.llm import JSON_OBJECT_RESPONSE_FORMAT, LlmClient
from app.core.config import Settings
from app.core.exceptions import AppException


def _settings(**overrides: Any) -> Settings:
    base: dict[str, Any] = {
        "environment": "test",
        "llm_api_key": "test-key",
        "llm_base_url": "https://api.openai.com/v1",
        "llm_model": "gpt-4o-mini",
        "llm_json_output": True,
        "jwt_secret": "test-secret-key-for-jwt-signing-32chars",
        "database_url": "postgresql+asyncpg://postgres:postgres@localhost:5432/fastapi_kit",
        "redis_url": "redis://localhost:6379/0",
    }
    base.update(overrides)
    return Settings(**base)


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict[str, Any]) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> dict[str, Any]:
        return self._payload


class _RecordingClient:
    def __init__(self, response: _FakeResponse) -> None:
        self.response = response
        self.last_json: dict[str, Any] | None = None

    async def __aenter__(self) -> "_RecordingClient":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def post(
        self,
        _url: str,
        *,
        headers: dict[str, str],
        json: dict[str, Any],
    ) -> _FakeResponse:
        del headers
        self.last_json = json
        return self.response


@pytest.mark.asyncio
async def test_complete_plain_omits_response_format(monkeypatch: pytest.MonkeyPatch) -> None:
    recorder = _RecordingClient(
        _FakeResponse(200, {"choices": [{"message": {"content": "  plain text  "}}]})
    )
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_kwargs: recorder)

    text = await LlmClient(_settings()).complete("sys", "user")
    assert text == "plain text"
    assert recorder.last_json is not None
    assert "response_format" not in recorder.last_json


@pytest.mark.asyncio
async def test_complete_json_output_sets_response_format(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorder = _RecordingClient(
        _FakeResponse(200, {"choices": [{"message": {"content": '{"ok": true}'}}]})
    )
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_kwargs: recorder)

    text = await LlmClient(_settings()).complete("sys", "user", json_output=True)
    assert text == '{"ok": true}'
    assert recorder.last_json is not None
    assert recorder.last_json["response_format"] == JSON_OBJECT_RESPONSE_FORMAT


@pytest.mark.asyncio
async def test_complete_json_output_respects_setting_off(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorder = _RecordingClient(
        _FakeResponse(200, {"choices": [{"message": {"content": "{}"}}]})
    )
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_kwargs: recorder)

    await LlmClient(_settings(llm_json_output=False)).complete("sys", "user", json_output=True)
    assert recorder.last_json is not None
    assert "response_format" not in recorder.last_json


@pytest.mark.asyncio
async def test_complete_requires_api_key() -> None:
    client = LlmClient(_settings(llm_api_key=None))
    with pytest.raises(AppException) as exc:
        await client.complete("sys", "user")
    assert exc.value.code == 50301
