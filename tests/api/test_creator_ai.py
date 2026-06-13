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


@pytest.mark.asyncio
async def test_ai_context_uses_latest_artifact_after_reconfirm(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"
    captured: list[str] = []

    async def fake_complete(_self, _system: str, user_prompt: str) -> str:
        captured.append(user_prompt)
        return "AI 钩子"

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "creator-ai-ctx@example.com")
    project = await create_short_video_project(client, token)
    project_id = project["id"]
    headers = auth_headers(token)

    await client.post(
        f"/api/v1/creator/projects/{project_id}/steps/topic/confirm",
        headers=headers,
        json={"content": "初版选题"},
    )
    await client.post(
        f"/api/v1/creator/projects/{project_id}/steps/topic/open",
        headers=headers,
    )
    await client.post(
        f"/api/v1/creator/projects/{project_id}/steps/topic/confirm",
        headers=headers,
        json={"content": "修订选题"},
    )

    response = await client.post(
        f"/api/v1/creator/projects/{project_id}/steps/hook/ai-suggest",
        headers=headers,
    )
    assert response.status_code == 200
    assert captured
    assert "修订选题" in captured[0]
    assert "初版选题" not in captured[0]


@pytest.mark.asyncio
async def test_ai_suggest_with_adjustment(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"
    captured: list[str] = []

    async def fake_complete(_self, _system: str, user_prompt: str) -> str:
        captured.append(user_prompt)
        return "更口语的脚本"

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "creator-ai-adj@example.com")
    project = await create_short_video_project(client, token)
    for step_key, content in [("topic", "选题"), ("hook", "钩子")]:
        await client.post(
            f"/api/v1/creator/projects/{project['id']}/steps/{step_key}/confirm",
            headers=auth_headers(token),
            json={"content": content},
        )

    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/script/ai-suggest",
        headers=auth_headers(token),
        json={"adjustment": "更口语"},
    )
    assert response.status_code == 200
    assert "更口语" in captured[-1]
