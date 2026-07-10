import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.repositories.user import UserRepository
from tests.api.creator_helpers import (
    advance_to_publish_step,
    auth_headers,
    check_all_publish_items,
    create_short_video_project,
    register_token,
)


async def _make_admin(db_engine, email: str) -> None:
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        repo = UserRepository(session)
        user = await repo.get_by_email(email)
        assert user is not None
        await repo.promote_to_admin(user)
        await session.commit()


@pytest.mark.asyncio
async def test_creator_metrics_summary(client: AsyncClient, db_engine) -> None:
    token = await register_token(client, "creator-metrics@example.com")
    project = await create_short_video_project(client, token)
    await advance_to_publish_step(client, token, project["id"], "short_video")
    await check_all_publish_items(client, token, project["id"])
    complete = await client.post(
        f"/api/v1/creator/projects/{project['id']}/complete",
        headers=auth_headers(token),
    )
    assert complete.status_code == 200
    await client.post(
        "/api/v1/auth/login",
        json={"email": "creator-metrics@example.com", "password": "securepass123"},
    )

    admin_email = "admin-metrics@example.com"
    await register_token(client, admin_email)
    await _make_admin(db_engine, admin_email)

    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": admin_email, "password": "securepass123"},
    )
    admin_token = admin_login.json()["data"]["tokens"]["access_token"]
    summary = await client.get(
        "/api/v1/admin/creator-metrics/summary",
        headers=auth_headers(admin_token),
    )
    assert summary.status_code == 200
    data = summary.json()["data"]
    assert data["project_created"] >= 1
    assert data["project_completed"] >= 1
    assert data["user_sessions"] >= 1


@pytest.mark.asyncio
async def test_creator_metrics_outline_events(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
    db_engine,
) -> None:
    test_settings.llm_api_key = "test-key"
    outline_json = """{
      "central_claim": "测试主张",
      "opening_hook": "测试钩子",
      "sections": [
        {"title": "一", "summary": "要点一"},
        {"title": "二", "summary": "要点二"},
        {"title": "三", "summary": "要点三"}
      ],
      "closing_cta": "测试结尾"
    }"""

    async def fake_complete(_self, _system: str, _user: str) -> str:
        return outline_json

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "creator-outline-metrics@example.com")
    headers = auth_headers(token)
    topic = {"title": "测试选题", "reason": "测试理由"}

    outline_resp = await client.post(
        "/api/v1/creator/playground/outline",
        headers=headers,
        json={"selected_topic": topic},
    )
    assert outline_resp.status_code == 200
    outline = outline_resp.json()["data"]["outline"]

    handoff_resp = await client.post(
        "/api/v1/creator/playground/handoff",
        headers=headers,
        json={
            "pipeline_id": "short_video",
            "title": topic["title"],
            "brief": topic["reason"],
            "outline": outline,
            "target_platform_keys": ["xiaohongshu"],
            "primary_platform_key": "xiaohongshu",
        },
    )
    assert handoff_resp.status_code == 200

    admin_email = "admin-outline-metrics@example.com"
    await register_token(client, admin_email)
    await _make_admin(db_engine, admin_email)
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": admin_email, "password": "securepass123"},
    )
    admin_token = admin_login.json()["data"]["tokens"]["access_token"]
    summary = await client.get(
        "/api/v1/admin/creator-metrics/summary",
        headers=auth_headers(admin_token),
    )
    data = summary.json()["data"]
    assert data["outline_generated"] >= 1
    assert data["outline_handoff"] >= 1
