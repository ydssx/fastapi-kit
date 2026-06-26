import json
import re

from app.creator.prompts import build_step_prompt
from app.schemas.creator import AiVariantOut

MULTI_VARIANT_STEPS: frozenset[str] = frozenset({"topic", "hook"})


def uses_multi_variant(step_key: str) -> bool:
    return step_key in MULTI_VARIANT_STEPS


def build_multi_variant_prompt(
    *,
    pipeline_id: str,
    step_key: str,
    project_title: str,
    brand_tone: str,
    brand_audience: str,
    brand_taboos: str,
    brand_structure: str,
    context: str,
    primary_platform_key: str | None = None,
    adjustment: str | None = None,
) -> tuple[str, str]:
    base_system, base_user = build_step_prompt(
        pipeline_id=pipeline_id,
        step_key=step_key,
        project_title=project_title,
        brand_tone=brand_tone,
        brand_audience=brand_audience,
        brand_taboos=brand_taboos,
        brand_structure=brand_structure,
        context=context,
        primary_platform_key=primary_platform_key,
        adjustment=adjustment,
    )
    system = (
        f"{base_system}\n"
        "只输出 JSON，不要 markdown 代码块或解释。"
        '格式: {"variants":[{"label":"简短角度名","content":"完整草稿"}, ...]}'
        "必须恰好 3 个 variant，label 须区分不同维度（如受众/结构/语气），content 互不雷同。"
    )
    user = f"{base_user}\n\n请生成 3 个不同角度的 JSON variants。"
    return system, user


def parse_variants_json(raw: str) -> list[AiVariantOut]:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        data = json.loads(text)
        items = data.get("variants", data) if isinstance(data, dict) else data
        if not isinstance(items, list):
            raise ValueError("variants must be a list")
        variants: list[AiVariantOut] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            label = str(item.get("label", "")).strip() or "建议"
            content = str(item.get("content", "")).strip()
            if content:
                variants.append(AiVariantOut(label=label[:50], content=content))
        if len(variants) >= 3:
            return variants[:3]
    except (json.JSONDecodeError, ValueError):
        pass
    return [AiVariantOut(label="建议", content=raw.strip())]
