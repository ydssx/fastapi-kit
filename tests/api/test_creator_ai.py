import pytest
from httpx import AsyncClient

from tests.api.creator_helpers import auth_headers, create_short_video_project, register_token


@pytest.mark.asyncio
async def test_ai_suggest_without_key(client: AsyncClient) -> None:
    token = await register_token(client, "creator-ai@example.com")
    project = await create_short_video_project(client, token)
    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/topic/ai-suggest",
        headers=auth_headers(token),
    )
    assert response.status_code == 503
    assert response.json()["code"] == 50301


@pytest.mark.asyncio
async def test_ai_suggest_success(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"

    async def fake_complete(_self, _system: str, _user: str) -> str:
        return "AI 生成的钩子"

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "creator-ai-ok@example.com")
    project = await create_short_video_project(client, token)
    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/topic/ai-suggest",
        headers=auth_headers(token),
    )
    assert response.status_code == 200
    assert "AI" in response.json()["data"]["suggestion"]
    usage = await client.get("/api/v1/creator/usage", headers=auth_headers(token))
    assert usage.json()["data"]["ai_calls"] == 1
