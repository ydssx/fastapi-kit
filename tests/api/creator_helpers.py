from httpx import AsyncClient

from app.creator.pipelines import PIPELINES


async def register_token(client: AsyncClient, email: str) -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "securepass123"},
    )
    assert response.status_code == 201
    return response.json()["data"]["tokens"]["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def create_short_video_project(
    client: AsyncClient,
    token: str,
    *,
    title: str = "测试选题",
    platforms: list[str] | None = None,
) -> dict:
    response = await client.post(
        "/api/v1/creator/projects",
        headers=auth_headers(token),
        json={
            "pipeline_id": "short_video",
            "title": title,
            "target_platform_keys": platforms or ["xiaohongshu", "wechat"],
        },
    )
    assert response.status_code == 201
    return response.json()["data"]


async def advance_to_publish_step(
    client: AsyncClient,
    token: str,
    project_id: str,
    pipeline_id: str,
) -> None:
    pipeline = PIPELINES[pipeline_id]
    headers = auth_headers(token)
    for step in pipeline.steps:
        if step.key == "publish":
            break
        content = f"内容-{step.key}"
        confirm = await client.post(
            f"/api/v1/creator/projects/{project_id}/steps/{step.key}/confirm",
            headers=headers,
            json={"content": content},
        )
        assert confirm.status_code == 200, confirm.text
