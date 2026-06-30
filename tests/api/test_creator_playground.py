import json

import pytest
from httpx import AsyncClient

from tests.api.creator_helpers import auth_headers, register_token

TOPICS_JSON = """{"topics": [
  {"title": "初夏通勤穿搭", "reason": "季节热点，适合你的受众"},
  {"title": "小个子显高技巧", "reason": "搜索需求稳定"},
  {"title": "胶囊衣橱 10 件", "reason": "清单体易传播"},
  {"title": "办公室舒适穿搭", "reason": "职场场景共鸣"},
  {"title": "平价品牌测评", "reason": "转化向内容"}
]}"""


@pytest.mark.asyncio
async def test_playground_topics_without_key(client: AsyncClient, test_settings) -> None:
    test_settings.llm_api_key = None
    token = await register_token(client, "pg-no-key@example.com")
    response = await client.post(
        "/api/v1/creator/playground/topics",
        headers=auth_headers(token),
    )
    assert response.status_code == 503
    assert response.json()["code"] == 50301


@pytest.mark.asyncio
async def test_playground_topics_success(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"

    async def fake_complete(_self, _system: str, _user: str) -> str:
        return TOPICS_JSON

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "pg-topics@example.com")
    response = await client.post(
        "/api/v1/creator/playground/topics",
        headers=auth_headers(token),
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert 5 <= len(data["topics"]) <= 10
    assert data["topics"][0]["title"]

    usage = await client.get("/api/v1/creator/usage", headers=auth_headers(token))
    assert usage.json()["data"]["playground_calls"] == 1
    assert usage.json()["data"]["playground_calls_limit"] == 30


SEED_TOPICS_JSON = """{"topics": [
  {"title": "职场通勤 3 套", "reason": "贴合 seed 方向"},
  {"title": "小个子显高穿搭", "reason": "细分受众"},
  {"title": "平价胶囊衣橱", "reason": "清单体易传播"}
]}"""


@pytest.mark.asyncio
async def test_playground_topics_with_seed(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"
    captured: list[str] = []

    async def fake_complete(_self, _system: str, user: str) -> str:
        captured.append(user)
        return SEED_TOPICS_JSON

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "pg-seed@example.com")
    response = await client.post(
        "/api/v1/creator/playground/topics",
        headers=auth_headers(token),
        json={"seed": "职场穿搭"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["topics"]) == 3
    assert captured
    assert "职场穿搭" in captured[0]


@pytest.mark.asyncio
async def test_playground_refine(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"

    async def fake_complete(_self, _system: str, _user: str) -> str:
        return "可以把角度收窄到职场新人。【理解】面向职场新人的通勤穿搭"

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "pg-refine@example.com")
    response = await client.post(
        "/api/v1/creator/playground/refine",
        headers=auth_headers(token),
        json={
            "selected_topic": {"title": "初夏通勤", "reason": "季节热点"},
            "messages": [{"role": "user", "content": "更聚焦职场新人"}],
        },
    )
    assert response.status_code == 200
    body = response.json()["data"]
    assert "职场新人" in body["reply"]
    assert body["understanding"]


@pytest.mark.asyncio
async def test_playground_handoff(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"
    token = await register_token(client, "pg-handoff@example.com")
    headers = auth_headers(token)

    response = await client.post(
        "/api/v1/creator/playground/handoff",
        headers=headers,
        json={
            "pipeline_id": "short_video",
            "title": "初夏通勤穿搭",
            "brief": "面向职场新人的 5 套胶囊搭配。",
            "hooks": "你是不是每天出门前都不知道穿什么？",
            "target_platform_keys": ["xiaohongshu", "douyin"],
            "primary_platform_key": "xiaohongshu",
        },
    )
    assert response.status_code == 200
    project_id = response.json()["data"]["project_id"]

    detail = await client.get(
        f"/api/v1/creator/projects/{project_id}",
        headers=headers,
    )
    project = detail.json()["data"]
    assert project["draft_content"]["topic"].strip()
    assert "初夏通勤" in project["draft_content"]["topic"]
    assert project["draft_content"]["hook"]
    assert set(project["target_platforms"]) == {"xiaohongshu", "douyin"}
    assert project["primary_platform_key"] == "xiaohongshu"


@pytest.mark.asyncio
async def test_playground_quota_exhausted(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"

    async def fake_complete(_self, _system: str, _user: str) -> str:
        return TOPICS_JSON

    def fake_limits(_self, _user):
        return (2, 50, 1)

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)
    monkeypatch.setattr("app.services.creator_usage.CreatorUsageService._limits", fake_limits)

    token = await register_token(client, "pg-quota@example.com")
    headers = auth_headers(token)
    first = await client.post("/api/v1/creator/playground/topics", headers=headers)
    assert first.status_code == 200

    second = await client.post("/api/v1/creator/playground/topics", headers=headers)
    assert second.status_code == 402
    assert second.json()["code"] == 40203


OUTLINE_JSON = """{
  "central_claim": "职场新人可以用胶囊衣橱减少决策疲劳",
  "opening_hook": "你是不是每天早上站在衣柜前发呆？",
  "sections": [
    {"title": "痛点", "summary": "决策疲劳与预算有限"},
    {"title": "方案", "summary": "10件基础款组合"},
    {"title": "案例", "summary": "一周5套不重样"}
  ],
  "closing_cta": "收藏这套清单，周一就能用"
}"""

SELECTED_TOPIC = {"title": "初夏通勤穿搭", "reason": "季节热点，适合你的受众"}


@pytest.mark.asyncio
async def test_playground_outline_generate_success(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"

    async def fake_complete(_self, _system: str, _user: str) -> str:
        return OUTLINE_JSON

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "pg-outline@example.com")
    headers = auth_headers(token)
    response = await client.post(
        "/api/v1/creator/playground/outline",
        headers=headers,
        json={"selected_topic": SELECTED_TOPIC},
    )
    assert response.status_code == 200
    outline = response.json()["data"]["outline"]
    assert outline["central_claim"]
    assert outline["opening_hook"]
    assert 3 <= len(outline["sections"]) <= 5
    assert outline["closing_cta"]

    usage = await client.get("/api/v1/creator/usage", headers=headers)
    assert usage.json()["data"]["playground_calls"] == 1


@pytest.mark.asyncio
async def test_playground_outline_generate_malformed(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"

    async def fake_complete(_self, _system: str, _user: str) -> str:
        return "not json"

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "pg-outline-bad@example.com")
    response = await client.post(
        "/api/v1/creator/playground/outline",
        headers=auth_headers(token),
        json={"selected_topic": SELECTED_TOPIC},
    )
    assert response.status_code == 503
    assert response.json()["code"] == 50305


@pytest.mark.asyncio
async def test_playground_outline_refine(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"
    current_outline = json.loads(OUTLINE_JSON)

    async def fake_complete(_self, _system: str, _user: str) -> str:
        refined = {**current_outline, "central_claim": "更聚焦职场新人胶囊衣橱"}
        return json.dumps(refined, ensure_ascii=False)

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "pg-outline-refine@example.com")
    headers = auth_headers(token)
    response = await client.post(
        "/api/v1/creator/playground/outline/refine",
        headers=headers,
        json={
            "selected_topic": SELECTED_TOPIC,
            "outline": current_outline,
            "messages": [{"role": "user", "content": "更聚焦职场新人"}],
        },
    )
    assert response.status_code == 200
    assert "职场新人" in response.json()["data"]["outline"]["central_claim"]

    usage = await client.get("/api/v1/creator/usage", headers=headers)
    assert usage.json()["data"]["playground_calls"] == 1


@pytest.mark.asyncio
async def test_playground_handoff_with_outline_short_video(
    client: AsyncClient,
    test_settings,
) -> None:
    test_settings.llm_api_key = "test-key"
    token = await register_token(client, "pg-outline-handoff-sv@example.com")
    headers = auth_headers(token)
    outline = json.loads(OUTLINE_JSON)

    response = await client.post(
        "/api/v1/creator/playground/handoff",
        headers=headers,
        json={
            "pipeline_id": "short_video",
            "title": SELECTED_TOPIC["title"],
            "brief": SELECTED_TOPIC["reason"],
            "outline": outline,
            "target_platform_keys": ["xiaohongshu"],
            "primary_platform_key": "xiaohongshu",
        },
    )
    assert response.status_code == 200
    project_id = response.json()["data"]["project_id"]

    detail = await client.get(
        f"/api/v1/creator/projects/{project_id}",
        headers=headers,
    )
    project = detail.json()["data"]
    assert "结构化大纲" in project["draft_content"]["topic"]
    assert project["draft_content"]["hook"]
    assert "核心主张" in project["draft_content"]["hook"]


@pytest.mark.asyncio
async def test_playground_handoff_with_edited_outline_hooks(
    client: AsyncClient,
    test_settings,
) -> None:
    test_settings.llm_api_key = "test-key"
    token = await register_token(client, "pg-outline-handoff-edit@example.com")
    headers = auth_headers(token)
    outline = json.loads(OUTLINE_JSON)
    edited_hook_text = "## 用户编辑后的大纲\n\n更犀利的开头钩子"

    response = await client.post(
        "/api/v1/creator/playground/handoff",
        headers=headers,
        json={
            "pipeline_id": "short_video",
            "title": SELECTED_TOPIC["title"],
            "brief": SELECTED_TOPIC["reason"],
            "outline": outline,
            "hooks": edited_hook_text,
            "target_platform_keys": ["xiaohongshu"],
            "primary_platform_key": "xiaohongshu",
        },
    )
    assert response.status_code == 200
    project_id = response.json()["data"]["project_id"]

    detail = await client.get(
        f"/api/v1/creator/projects/{project_id}",
        headers=headers,
    )
    project = detail.json()["data"]
    assert "结构化大纲" in project["draft_content"]["topic"]
    assert edited_hook_text in project["draft_content"]["topic"]
    assert project["draft_content"]["hook"] == edited_hook_text


@pytest.mark.asyncio
async def test_playground_handoff_with_outline_long_article(
    client: AsyncClient,
    test_settings,
) -> None:
    test_settings.llm_api_key = "test-key"
    token = await register_token(client, "pg-outline-handoff-la@example.com")
    headers = auth_headers(token)
    outline = json.loads(OUTLINE_JSON)

    response = await client.post(
        "/api/v1/creator/playground/handoff",
        headers=headers,
        json={
            "pipeline_id": "long_article",
            "title": SELECTED_TOPIC["title"],
            "brief": SELECTED_TOPIC["reason"],
            "outline": outline,
            "target_platform_keys": ["wechat"],
            "primary_platform_key": "wechat",
        },
    )
    assert response.status_code == 200
    project_id = response.json()["data"]["project_id"]

    detail = await client.get(
        f"/api/v1/creator/projects/{project_id}",
        headers=headers,
    )
    project = detail.json()["data"]
    assert project["draft_content"]["outline"]
    assert "段落要点" in project["draft_content"]["outline"]


@pytest.mark.asyncio
async def test_playground_outline_quota_exhausted(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"

    async def fake_complete(_self, _system: str, _user: str) -> str:
        return OUTLINE_JSON

    def fake_limits(_self, _user):
        return (2, 50, 1)

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)
    monkeypatch.setattr("app.services.creator_usage.CreatorUsageService._limits", fake_limits)

    token = await register_token(client, "pg-outline-quota@example.com")
    headers = auth_headers(token)
    first = await client.post(
        "/api/v1/creator/playground/outline",
        headers=headers,
        json={"selected_topic": SELECTED_TOPIC},
    )
    assert first.status_code == 200

    second = await client.post(
        "/api/v1/creator/playground/outline",
        headers=headers,
        json={"selected_topic": SELECTED_TOPIC},
    )
    assert second.status_code == 402
    assert second.json()["code"] == 40203
