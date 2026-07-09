#!/usr/bin/env python3
"""Measurement harness for creator short_video script AI suggestion quality.

Outputs a single JSON object to stdout with gate + diagnostic metrics.
Uses the project's LlmClient and build_step_prompt (production path).
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import statistics
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

# Ensure repo root is importable when run from worktrees / other cwd.
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.clients.llm import LlmClient  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.creator.prompts import build_step_prompt  # noqa: E402

FIXTURES_PATH = Path(__file__).with_name("fixtures.json")
JUDGE_RUBRIC = """你是评分员，为创作者工作台的中文短视频口播脚本 AI 草稿打分。
每个样本会给出：品牌档案、选题、已确认上文、主平台、以及模型建议稿。

对两个维度打 1-5 分：
adoptable（创作者能否少量修改后直接当口播草稿用）：
- 5: 完整口播稿，节拍清晰，几乎可直接用
- 4: 强草稿，仅小瑕疵
- 3: 骨架可用，但需大段改写
- 2: 单薄/空泛/难朗读
- 1: 不可用（空、元叙述、非中文、不是脚本）

fit（品牌与平台贴合）：
- 5: 语气/受众/禁忌与平台侧重都落实得好
- 4: 大体贴合，一处小偏差
- 3: 偏通用，品牌/平台线索弱
- 2: 明显违禁或风格错位
- 1: 忽略品牌/平台或严重违禁

同时报告：
- has_spoken_structure (bool): 是否有开头钩子 + 正文节拍
- taboo_violation (bool): 是否使用了品牌禁忌表述
- is_meta (bool): 是否在解释过程而不是给草稿正文

只输出 JSON：
{"adoptable": <1-5>, "fit": <1-5>, "has_spoken_structure": <bool>,
 "taboo_violation": <bool>, "is_meta": <bool>, "notes": "<短说明>"}
"""

META_HINTS = (
    "作为ai",
    "作为助手",
    "我无法",
    "我不能",
    "以下是分析",
    "首先分析",
    "根据你的要求，我将",
    "下面我来说明",
    "step by step",
    "as an ai",
)


def _looks_meta_or_empty(text: str) -> bool:
    body = text.strip()
    if len(body) < 40:
        return True
    lower = body.lower()
    if any(h in lower for h in META_HINTS):
        return True
    # Pure process narration without spoken lines
    if body.startswith(("好的", "当然", "我来", "让我")) and "：" not in body[:80]:
        if "开场" not in body and "钩子" not in body and len(body) < 120:
            return True
    return False


def _parse_judge_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("judge output must be object")
    return data


def _clamp_score(value: Any, default: int = 1) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(5, n))


async def _generate_one(llm: LlmClient, case: dict[str, Any]) -> dict[str, Any]:
    system, user = build_step_prompt(
        pipeline_id=case["pipeline_id"],
        step_key=case["step_key"],
        project_title=case["project_title"],
        brand_tone=case.get("brand_tone", ""),
        brand_audience=case.get("brand_audience", ""),
        brand_taboos=case.get("brand_taboos", ""),
        brand_structure=case.get("brand_structure", ""),
        context=case.get("context", ""),
        primary_platform_key=case.get("primary_platform_key"),
    )
    t0 = time.perf_counter()
    error: str | None = None
    suggestion = ""
    try:
        suggestion = await llm.complete(system, user)
    except Exception as exc:  # noqa: BLE001 — harness must continue
        error = f"{type(exc).__name__}: {exc}"
    latency_ms = (time.perf_counter() - t0) * 1000
    return {
        "id": case["id"],
        "bucket": case["bucket"],
        "suggestion": suggestion,
        "latency_ms": latency_ms,
        "error": error,
        "empty_or_meta": _looks_meta_or_empty(suggestion) if suggestion else True,
        "case": case,
        "system": system,
        "user": user,
    }


async def _judge_one(llm: LlmClient, gen: dict[str, Any]) -> dict[str, Any]:
    case = gen["case"]
    user = (
        f"主平台: {case.get('primary_platform_key')}\n"
        f"选题: {case['project_title']}\n"
        f"品牌语气: {case.get('brand_tone', '')}\n"
        f"受众: {case.get('brand_audience', '')}\n"
        f"禁忌: {case.get('brand_taboos', '')}\n"
        f"结构偏好: {case.get('brand_structure', '')}\n"
        f"已确认上文:\n{case.get('context', '')}\n\n"
        f"模型建议稿:\n{gen['suggestion']}\n"
    )
    raw = await llm.complete(JUDGE_RUBRIC, user)
    data = _parse_judge_json(raw)
    adoptable = _clamp_score(data.get("adoptable"))
    fit = _clamp_score(data.get("fit"))
    weighted = 0.6 * adoptable + 0.4 * fit
    return {
        "adoptable": adoptable,
        "fit": fit,
        "weighted_quality": weighted,
        "has_spoken_structure": bool(data.get("has_spoken_structure", False)),
        "taboo_violation": bool(data.get("taboo_violation", False)),
        "is_meta": bool(data.get("is_meta", False)),
        "notes": str(data.get("notes", ""))[:300],
    }


def _run_unit_tests() -> int:
    env = os.environ.copy()
    env.setdefault(
        "TEST_DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/fastapi_kit",
    )
    env.setdefault("TEST_REDIS_URL", "redis://localhost:6379/0")
    proc = subprocess.run(
        [
            "uv",
            "run",
            "pytest",
            "tests/api/test_creator_ai.py",
            "-q",
            "--tb=no",
        ],
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    return 1 if proc.returncode == 0 else 0


async def _amain() -> dict[str, Any]:
    settings = get_settings()
    if not settings.llm_api_key:
        raise SystemExit("LLM_API_KEY is required for this evaluation harness")

    cases: list[dict[str, Any]] = json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))
    llm = LlmClient(settings)

    generations: list[dict[str, Any]] = []
    for case in cases:
        generations.append(await _generate_one(llm, case))

    success = [g for g in generations if g["suggestion"].strip() and g["error"] is None]
    generation_success_rate = len(success) / max(len(generations), 1)
    empty_or_meta_rate = sum(1 for g in generations if g["empty_or_meta"]) / max(
        len(generations), 1
    )

    judged: list[dict[str, Any]] = []
    judge_errors = 0
    for gen in success:
        if gen["empty_or_meta"]:
            judged.append(
                {
                    "id": gen["id"],
                    "bucket": gen["bucket"],
                    "adoptable": 1,
                    "fit": 1,
                    "weighted_quality": 1.0,
                    "has_spoken_structure": False,
                    "taboo_violation": False,
                    "is_meta": True,
                    "notes": "degenerate empty/meta gate",
                }
            )
            continue
        try:
            score = await _judge_one(llm, gen)
            score["id"] = gen["id"]
            score["bucket"] = gen["bucket"]
            judged.append(score)
        except Exception as exc:  # noqa: BLE001
            judge_errors += 1
            judged.append(
                {
                    "id": gen["id"],
                    "bucket": gen["bucket"],
                    "adoptable": 1,
                    "fit": 1,
                    "weighted_quality": 1.0,
                    "has_spoken_structure": False,
                    "taboo_violation": False,
                    "is_meta": False,
                    "notes": f"judge_error: {type(exc).__name__}: {exc}",
                }
            )

    unit_tests_passed = _run_unit_tests()

    weighted_scores = [j["weighted_quality"] for j in judged] or [0.0]
    adoptables = [j["adoptable"] for j in judged] or [0]
    fits = [j["fit"] for j in judged] or [0]
    latencies = [g["latency_ms"] for g in generations]
    chars = [len(g["suggestion"]) for g in generations]

    # Rough cost proxy: ~$0.002 per generate+judge pair on mini models (diagnostic only)
    judge_cost_usd = round(0.002 * (len(generations) + len(success)), 4)

    result: dict[str, Any] = {
        "generation_success_rate": round(generation_success_rate, 4),
        "empty_or_meta_rate": round(empty_or_meta_rate, 4),
        "unit_tests_passed": unit_tests_passed,
        "weighted_quality": round(statistics.mean(weighted_scores), 4),
        "mean_adoptable": round(statistics.mean(adoptables), 4),
        "mean_fit": round(statistics.mean(fits), 4),
        "mean_chars": round(statistics.mean(chars), 1) if chars else 0.0,
        "latency_ms_p50": round(statistics.median(latencies), 1) if latencies else 0.0,
        "judge_cost_usd": judge_cost_usd,
        "taboo_violation_rate": round(
            sum(1 for j in judged if j["taboo_violation"]) / max(len(judged), 1), 4
        ),
        "meta_rate": round(sum(1 for j in judged if j["is_meta"]) / max(len(judged), 1), 4),
        "judge_errors": judge_errors,
        "sample_count": len(judged),
        "samples": [
            {
                "id": j["id"],
                "bucket": j["bucket"],
                "weighted_quality": j["weighted_quality"],
                "adoptable": j["adoptable"],
                "fit": j["fit"],
                "notes": j["notes"],
            }
            for j in judged
        ],
    }
    return result


def main() -> None:
    result = asyncio.run(_amain())
    payload = json.dumps(result, ensure_ascii=False)
    sys.stdout.buffer.write(payload.encode("utf-8"))
    sys.stdout.buffer.write(b"\n")


if __name__ == "__main__":
    main()
