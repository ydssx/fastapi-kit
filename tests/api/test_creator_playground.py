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
async def test_playground_topics_without_key(client: AsyncClient) -> None:
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
