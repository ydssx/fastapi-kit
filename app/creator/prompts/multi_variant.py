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


_VARIANT_PAIR_RE = re.compile(
    r'"label"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"content"\s*:\s*"((?:\\.|[^"\\])*)"',
    re.DOTALL,
)


def _decode_json_string(value: str) -> str:
    try:
        decoded = json.loads(f'"{value}"')
    except json.JSONDecodeError:
        return value.replace("\\n", "\n").replace('\\"', '"').replace("\\\\", "\\")
    return decoded if isinstance(decoded, str) else value


def _variants_from_items(items: object) -> list[AiVariantOut]:
    if not isinstance(items, list):
        return []
    variants: list[AiVariantOut] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label", "")).strip() or "建议"
        content = str(item.get("content", "")).strip()
        if content:
            variants.append(AiVariantOut(label=label[:50], content=content))
    return variants


def _variants_from_json(text: str) -> list[AiVariantOut]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []
    items = data.get("variants", data) if isinstance(data, dict) else data
    return _variants_from_items(items)


def _repair_missing_object_braces(text: str) -> str:
    """Fix common LLM slip: `}, "label"` instead of `}, {"label"` between variants."""
    return re.sub(r"(\})\s*,\s*(\"label\")", r"\1,{\2", text)


def _variants_from_regex(text: str) -> list[AiVariantOut]:
    variants: list[AiVariantOut] = []
    for label_raw, content_raw in _VARIANT_PAIR_RE.findall(text):
        label = _decode_json_string(label_raw).strip() or "建议"
        content = _decode_json_string(content_raw).strip()
        if content:
            variants.append(AiVariantOut(label=label[:50], content=content))
    return variants


def parse_variants_json(raw: str) -> list[AiVariantOut]:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()

    variants = _variants_from_json(text)
    if len(variants) >= 2:
        return variants[:3]

    repaired = _repair_missing_object_braces(text)
    if repaired != text:
        variants = _variants_from_json(repaired) or variants
        if len(variants) >= 2:
            return variants[:3]

    extracted = _variants_from_regex(text)
    if len(extracted) >= 2:
        return extracted[:3]
    if variants:
        return variants[:3]
    if extracted:
        return extracted[:3]
    return [AiVariantOut(label="建议", content=raw.strip())]
