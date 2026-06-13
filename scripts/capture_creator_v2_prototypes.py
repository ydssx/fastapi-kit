#!/usr/bin/env python3
"""Seed Creator v2 screenshot data and capture prototype PNGs via agent-browser."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "creator" / "docs" / "prototypes" / "v2"
BASE_URL = "http://127.0.0.1:8000"
CREATOR_BASE = os.environ.get("CREATOR_DEV_URL", "http://localhost:5176/creator")
PASSWORD = "PrototypeV2!23"
AGENT_BROWSER = shutil.which("agent-browser") or "agent-browser"

RUN_TAG = datetime.now(UTC).strftime("%Y%m%d%H%M")
MAIN_EMAIL = f"mock-v2-main-{RUN_TAG}@local.dev"
EMPTY_EMAIL = f"mock-v2-empty-{RUN_TAG}@local.dev"
QUOTA_EMAIL = f"mock-v2-quota-{RUN_TAG}@local.dev"

BRAND = {
    "tone": "口语化、亲切",
    "audience": "18-25 岁女性",
    "taboos": "避免夸张承诺",
    "structure_notes": "开头钩子 + 分点论述",
}


def run_agent(*args: str) -> None:
    cmd = [AGENT_BROWSER, *args]
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True, shell=False)


def api_client() -> httpx.Client:
    return httpx.Client(base_url=BASE_URL, verify=False, timeout=30.0)


def register_or_login(client: httpx.Client, email: str) -> str:
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD},
    )
    if reg.status_code == 201:
        return reg.json()["data"]["tokens"]["access_token"]
    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    login.raise_for_status()
    return login.json()["data"]["tokens"]["access_token"]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_project(
    client: httpx.Client,
    token: str,
    *,
    pipeline_id: str,
    title: str,
    platforms: list[str],
) -> dict[str, Any]:
    resp = client.post(
        "/api/v1/creator/projects",
        headers=auth(token),
        json={
            "pipeline_id": pipeline_id,
            "title": title,
            "target_platform_keys": platforms,
        },
    )
    resp.raise_for_status()
    return resp.json()["data"]


def confirm_step(
    client: httpx.Client,
    token: str,
    project_id: str,
    step_key: str,
    content: str,
) -> None:
    resp = client.post(
        f"/api/v1/creator/projects/{project_id}/steps/{step_key}/confirm",
        headers=auth(token),
        json={"content": content},
    )
    if resp.status_code >= 400:
        raise RuntimeError(
            f"confirm {step_key} failed ({resp.status_code}): {resp.text}"
        )


def advance_short_to_script(client: httpx.Client, token: str, project_id: str) -> None:
    confirm_step(client, token, project_id, "topic", "初夏穿搭 3 件套：实用又上镜")
    confirm_step(
        client,
        token,
        project_id,
        "hook",
        "姐妹们！三件套搞定一周穿搭，最后一组绝了…",
    )


def advance_short_to_publish(client: httpx.Client, token: str, project_id: str) -> None:
    advance_short_to_script(client, token, project_id)
    for key, content in [
        ("script", "口播：今天分享三套初夏穿搭…"),
        ("storyboard", "1. 开场半身 2. 三套平铺 3. 结尾回眸"),
        ("cover_title", "标题：初夏 3 件套穿搭公式"),
        ("production_notes", "B-roll：衣柜特写、街景_walk"),
    ]:
        confirm_step(client, token, project_id, key, content)


def advance_long_to_body(client: httpx.Client, token: str, project_id: str) -> None:
    confirm_step(client, token, project_id, "topic", "AI 工具对比：创作者怎么选")
    confirm_step(
        client,
        token,
        project_id,
        "outline",
        "1. 痛点 2. 三款工具 3. 结论",
    )


def complete_project(client: httpx.Client, token: str, project_id: str) -> None:
    advance_short_to_publish(client, token, project_id)
    checklist = client.get(
        f"/api/v1/creator/projects/{project_id}/publish-checklist",
        headers=auth(token),
    )
    checklist.raise_for_status()
    keys = [
        f"{item['platform']}:{item['item_key']}"
        for item in checklist.json()["data"]
    ]
    client.patch(
        f"/api/v1/creator/projects/{project_id}/publish-checklist",
        headers=auth(token),
        json={"checked_keys": keys},
    ).raise_for_status()
    client.post(
        f"/api/v1/creator/projects/{project_id}/complete",
        headers=auth(token),
    ).raise_for_status()


def seed() -> tuple[dict[str, str], str]:
    with api_client() as client:
        main_token = register_or_login(client, MAIN_EMAIL)
        empty_token = register_or_login(client, EMPTY_EMAIL)
        quota_token = register_or_login(client, QUOTA_EMAIL)

        client.put(
            "/api/v1/creator/brand-profile",
            headers=auth(main_token),
            json=BRAND,
        ).raise_for_status()

        wizard = create_project(
            client,
            main_token,
            pipeline_id="short_video",
            title="初夏穿搭 3 件套",
            platforms=["douyin", "xiaohongshu"],
        )
        advance_short_to_script(client, main_token, wizard["id"])

        long_proj = create_project(
            client,
            main_token,
            pipeline_id="long_article",
            title="AI 工具对比指南",
            platforms=["wechat", "xiaohongshu"],
        )
        advance_long_to_body(client, main_token, long_proj["id"])

        publish_proj = create_project(
            client,
            main_token,
            pipeline_id="short_video",
            title="读书清单推荐",
            platforms=["bilibili", "douyin"],
        )
        advance_short_to_publish(client, main_token, publish_proj["id"])

        completed = create_project(
            client,
            main_token,
            pipeline_id="short_video",
            title="周末 vlog 剪辑技巧",
            platforms=["douyin"],
        )
        complete_project(client, main_token, completed["id"])

        quota_proj = create_project(
            client,
            quota_token,
            pipeline_id="short_video",
            title="配额用尽演示",
            platforms=["douyin"],
        )
        advance_short_to_script(client, quota_token, quota_proj["id"])

    return (
        {
            "wizard_id": wizard["id"],
            "publish_id": publish_proj["id"],
            "completed_id": completed["id"],
            "quota_id": quota_proj["id"],
        },
        quota_token,
    )


def set_ai_quota_exhausted(client: httpx.Client, token: str, email: str) -> None:
    client.get("/api/v1/creator/usage", headers=auth(token))
    sql = (
        "UPDATE creator_usage_counters SET ai_calls = 50 "
        f"WHERE user_id = (SELECT id FROM users WHERE email = '{email}');"
    )
    docker_cmd = [
        "docker",
        "compose",
        "exec",
        "-T",
        "postgres",
        "psql",
        "-U",
        "postgres",
        "-d",
        "fastapi_kit",
        "-c",
        sql,
    ]
    env = {**os.environ, "PGPASSWORD": "postgres"}
    result = subprocess.run(
        docker_cmd, cwd=ROOT, capture_output=True, text=True, env=env
    )
    if result.returncode == 0 and "UPDATE 1" in (result.stdout + result.stderr):
        return
    print("Warning: could not set AI quota via SQL; quota screenshot may not show limit state.")
    print(result.stdout, result.stderr)


def scroll_to_workspace() -> None:
    run_agent("scrollintoview", "#creator-step-workspace")
    run_agent("wait", "400")


def capture_wizard_viewport(
    path: Path, *, expand_mobile_ai: bool = False, trigger_ai: bool = False
) -> None:
    scroll_to_workspace()
    if trigger_ai:
        run_agent("find", "role", "button", "click", "--name", "换一版")
        run_agent("wait", "800")
    if expand_mobile_ai:
        run_agent("find", "role", "button", "click", "--name", "展开")
        run_agent("wait", "500")
    run_agent("screenshot", str(path))


def login_via_ui(email: str) -> None:
    run_agent("open", f"{CREATOR_BASE}/login")
    run_agent("wait", "1000")
    run_agent("find", "placeholder", "请输入邮箱地址", "fill", email)
    run_agent("find", "placeholder", "请输入密码", "fill", PASSWORD)
    run_agent("find", "role", "button", "click", "--name", "登录")
    run_agent("wait", "--load", "networkidle")


def capture_screenshots(ids: dict[str, str]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # P1 login (logged out)
    run_agent("open", f"{CREATOR_BASE}/login")
    run_agent("eval", "localStorage.clear()")
    run_agent("reload")
    run_agent("wait", "1500")
    run_agent("screenshot", str(OUT_DIR / "prototype-v2-login.png"))

    # Main user flows
    login_via_ui(MAIN_EMAIL)

    run_agent("open", f"{CREATOR_BASE}/")
    run_agent("wait", "2000")
    run_agent("screenshot", str(OUT_DIR / "prototype-v2-projects.png"))

    run_agent("open", f"{CREATOR_BASE}/brand")
    run_agent("wait", "1500")
    run_agent("screenshot", str(OUT_DIR / "prototype-v2-brand.png"))

    run_agent("open", f"{CREATOR_BASE}/projects/{ids['wizard_id']}")
    run_agent("wait", "3000")
    capture_wizard_viewport(OUT_DIR / "prototype-v2-wizard.png")

    run_agent("open", f"{CREATOR_BASE}/projects/{ids['publish_id']}")
    run_agent("wait", "2000")
    run_agent("scrollintoview", "h2")
    run_agent("wait", "400")
    run_agent("screenshot", str(OUT_DIR / "prototype-v2-publish.png"))

    run_agent("open", f"{CREATOR_BASE}/projects/{ids['completed_id']}")
    run_agent("wait", "2000")
    run_agent("screenshot", str(OUT_DIR / "prototype-v2-completed.png"))

    # Empty user
    run_agent("eval", "localStorage.removeItem('fastapi_kit_creator_tokens')")
    login_via_ui(EMPTY_EMAIL)
    run_agent("open", f"{CREATOR_BASE}/")
    run_agent("wait", "1500")
    run_agent("screenshot", str(OUT_DIR / "prototype-v2-projects-empty.png"))

    # Quota exhausted
    run_agent("eval", "localStorage.removeItem('fastapi_kit_creator_tokens')")
    login_via_ui(QUOTA_EMAIL)
    run_agent("open", f"{CREATOR_BASE}/projects/{ids['quota_id']}")
    run_agent("wait", "2500")
    capture_wizard_viewport(OUT_DIR / "prototype-v2-wizard-quota.png", trigger_ai=True)

    # AI loading — hang ai-suggest fetch so panel stays in loading state
    run_agent("eval", "localStorage.removeItem('fastapi_kit_creator_tokens')")
    login_via_ui(MAIN_EMAIL)
    run_agent(
        "eval",
        "(()=>{const o=window.fetch.bind(window);window.fetch=(i,n)=>{const u=typeof i==='string'?i:i.url;if(String(u).includes('ai-suggest'))return new Promise(()=>{});return o(i,n)}})()",
    )
    run_agent("open", f"{CREATOR_BASE}/projects/{ids['wizard_id']}")
    run_agent("wait", "1200")
    capture_wizard_viewport(OUT_DIR / "prototype-v2-wizard-ai-loading.png")

    # Mobile wizard
    run_agent("set", "viewport", "390", "844")
    run_agent("open", f"{CREATOR_BASE}/projects/{ids['wizard_id']}")
    run_agent("wait", "2500")
    capture_wizard_viewport(OUT_DIR / "prototype-v2-wizard-mobile.png", expand_mobile_ai=True)
    run_agent("set", "viewport", "1280", "800")

    run_agent("close")


def main() -> int:
    state_file = OUT_DIR / ".capture-state.json"
    print("Seeding Creator v2 screenshot data…")
    ids, quota_token = seed()
    state = {"ids": ids, "main_email": MAIN_EMAIL, "empty_email": EMPTY_EMAIL, "quota_email": QUOTA_EMAIL}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    state_file.write_text(__import__("json").dumps(state, indent=2), encoding="utf-8")
    print("Setting AI quota exhausted for", QUOTA_EMAIL)
    with api_client() as client:
        set_ai_quota_exhausted(client, quota_token, QUOTA_EMAIL)
    print("Capturing screenshots to", OUT_DIR)
    capture_screenshots(ids)
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
