import pytest
from httpx import AsyncClient

from tests.api.creator_helpers import auth_headers, create_short_video_project, register_token


@pytest.mark.asyncio
async def test_ai_suggest_without_key(client: AsyncClient, test_settings) -> None:
    test_settings.llm_api_key = None
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

    async def fake_complete(_self, _system: str, _user: str, **_kwargs: object) -> str:
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
    assert response.json()["data"]["variants"]
    usage = await client.get("/api/v1/creator/usage", headers=auth_headers(token))
    assert usage.json()["data"]["ai_calls"] == 1


VARIANTS_JSON = """{"variants": [
  {"label": "受众向", "content": "面向职场新人的穿搭指南"},
  {"label": "结构向", "content": "3 套胶囊衣橱清单体"},
  {"label": "语气向", "content": "轻松口语的开场选题稿"}
]}"""


@pytest.mark.asyncio
async def test_ai_suggest_multi_variant_topic(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"

    async def fake_complete(_self, _system: str, _user: str, **_kwargs: object) -> str:
        return VARIANTS_JSON

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "creator-ai-multi@example.com")
    project = await create_short_video_project(client, token)
    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/topic/ai-suggest",
        headers=auth_headers(token),
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["variants"]) == 3
    assert data["suggestion"] == data["variants"][0]["content"]
    usage = await client.get("/api/v1/creator/usage", headers=auth_headers(token))
    assert usage.json()["data"]["ai_calls"] == 1


@pytest.mark.asyncio
async def test_ai_suggest_script_single_variant(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"

    async def fake_complete(_self, _system: str, _user: str, **_kwargs: object) -> str:
        return "完整口播脚本"

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "creator-ai-script@example.com")
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
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["variants"]) == 1
    assert data["suggestion"] == "完整口播脚本"


@pytest.mark.asyncio
async def test_ai_context_uses_latest_artifact_after_reconfirm(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"
    captured: list[str] = []

    async def fake_complete(_self, _system: str, user_prompt: str, **_kwargs: object) -> str:
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

    async def fake_complete(_self, _system: str, user_prompt: str, **_kwargs: object) -> str:
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


@pytest.mark.asyncio
async def test_ai_prompt_includes_xhs_rules_when_primary_xiaohongshu(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"
    captured: list[str] = []

    async def fake_complete(_self, _system: str, user_prompt: str, **_kwargs: object) -> str:
        captured.append(user_prompt)
        return "小红书脚本"

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "creator-ai-xhs@example.com")
    project = await create_short_video_project(
        client,
        token,
        platforms=["xiaohongshu"],
        primary_platform_key="xiaohongshu",
    )
    for step_key, content in [("topic", "选题"), ("hook", "钩子")]:
        await client.post(
            f"/api/v1/creator/projects/{project['id']}/steps/{step_key}/confirm",
            headers=auth_headers(token),
            json={"content": content},
        )

    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/script/ai-suggest",
        headers=auth_headers(token),
    )
    assert response.status_code == 200
    assert captured
    prompt = captured[-1]
    assert "小红书" in prompt
    assert "口语" in prompt
    assert "钩子" in prompt


@pytest.mark.asyncio
async def test_ai_prompt_excludes_xhs_when_primary_wechat(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"
    captured: list[str] = []

    async def fake_complete(_self, _system: str, user_prompt: str, **_kwargs: object) -> str:
        captured.append(user_prompt)
        return "公众号正文"

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "creator-ai-wechat@example.com")
    project = await create_short_video_project(
        client,
        token,
        platforms=["xiaohongshu", "wechat"],
        primary_platform_key="wechat",
    )
    for step_key, content in [("topic", "选题"), ("hook", "钩子")]:
        await client.post(
            f"/api/v1/creator/projects/{project['id']}/steps/{step_key}/confirm",
            headers=auth_headers(token),
            json={"content": content},
        )

    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/script/ai-suggest",
        headers=auth_headers(token),
    )
    assert response.status_code == 200
    assert captured
    assert "【平台写作要求 · 小红书" not in captured[-1]


@pytest.mark.asyncio
async def test_ai_suggest_selection_rewrite_success(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"
    captured: list[str] = []

    async def fake_complete(_self, _system: str, user_prompt: str, **_kwargs: object) -> str:
        captured.append(user_prompt)
        return "新中间段"

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "creator-ai-sel@example.com")
    project = await create_short_video_project(client, token)
    for step_key, content in [("topic", "选题"), ("hook", "钩子")]:
        await client.post(
            f"/api/v1/creator/projects/{project['id']}/steps/{step_key}/confirm",
            headers=auth_headers(token),
            json={"content": content},
        )
    await client.patch(
        f"/api/v1/creator/projects/{project['id']}/steps/script",
        headers=auth_headers(token),
        json={"content": "钩子。旧中间段。CTA。"},
    )

    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/script/ai-suggest",
        headers=auth_headers(token),
        json={
            "mode": "selection",
            "selected_text": "旧中间段",
            "adjustment": "更简短",
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["suggestion"] == "新中间段"
    assert len(data["variants"]) == 1
    assert "旧中间段" in captured[-1]
    assert "只输出改写后的选中片段" in captured[-1] or "需要改写的选中片段" in captured[-1]
    assert "更简短" in captured[-1]
    usage = await client.get("/api/v1/creator/usage", headers=auth_headers(token))
    assert usage.json()["data"]["ai_calls"] == 1


@pytest.mark.asyncio
async def test_ai_suggest_selection_on_multi_variant_step_is_single(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"
    called_json: list[bool] = []

    async def fake_complete(
        _self, _system: str, _user: str, *, json_output: bool = False, **_kwargs: object
    ) -> str:
        called_json.append(json_output)
        return "局部改写选题"

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "creator-ai-sel-topic@example.com")
    project = await create_short_video_project(client, token)
    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/topic/ai-suggest",
        headers=auth_headers(token),
        json={"mode": "selection", "selected_text": "旧选题片段"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["suggestion"] == "局部改写选题"
    assert len(data["variants"]) == 1
    assert called_json == [False]


@pytest.mark.asyncio
async def test_ai_suggest_selection_empty_text_rejected(
    client: AsyncClient,
    test_settings,
) -> None:
    test_settings.llm_api_key = "test-key"
    token = await register_token(client, "creator-ai-sel-empty@example.com")
    project = await create_short_video_project(client, token)
    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/topic/ai-suggest",
        headers=auth_headers(token),
        json={"mode": "selection", "selected_text": "   "},
    )
    assert response.status_code == 400
    assert response.json()["code"] == 40026


async def test_ai_suggest_selection_empty_llm_response_rejected(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"

    async def fake_complete(_self, _system: str, _user: str, **_kwargs: object) -> str:
        return "   "

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "creator-ai-sel-empty-llm@example.com")
    project = await create_short_video_project(client, token)
    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/topic/ai-suggest",
        headers=auth_headers(token),
        json={"mode": "selection", "selected_text": "旧选题片段"},
    )
    assert response.status_code == 502
    assert response.json()["code"] == 40027
