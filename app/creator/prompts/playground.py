import json
import re

from app.schemas.creator import (
    BrandProfileOut,
    PlaygroundMessage,
    PlaygroundOutline,
    PlaygroundOutlineSection,
    PlaygroundTopic,
)


def _brand_block(brand: BrandProfileOut) -> str:
    if not any(
        [
            brand.tone.strip(),
            brand.audience.strip(),
            brand.taboos.strip(),
            brand.structure_notes.strip(),
        ]
    ):
        return "（用户尚未配置品牌档案，请生成通用但可执行的选题。）"
    return (
        f"品牌语气: {brand.tone}\n受众: {brand.audience}\n禁忌: {brand.taboos}\n"
        f"结构偏好: {brand.structure_notes}"
    )


def build_topics_prompt(brand: BrandProfileOut, seed: str | None = None) -> tuple[str, str]:
    seed_text = seed.strip() if seed else ""
    if seed_text:
        system = (
            "你是中文内容策划助手，帮助创作者根据模糊方向生成可执行的选题标题。"
            "只输出 JSON，不要 markdown 代码块或解释。"
            '格式: {"topics": [{"title": "短标题", "reason": "一句话理由"}]}'
            "生成恰好 3 条互不重复的选题。"
        )
        user_status = "用户已有大致方向，需要 3 个具体选题标题候选。"
    else:
        system = (
            "你是中文内容策划助手，帮助创作者在完全空白时找到可执行的选题方向。"
            "只输出 JSON，不要 markdown 代码块或解释。"
            '格式: {"topics": [{"title": "短标题", "reason": "一句话理由"}]}'
            "生成 5 到 10 条互不重复的选题。"
        )
        user_status = "用户状态：完全不知道写什么，需要选题清单。"
    user_parts = [
        user_status,
        _brand_block(brand),
    ]
    if seed_text:
        user_parts.append(f"\n用户补充方向: {seed_text}")
    user_parts.append("\n请生成选题 JSON。")
    return system, "\n".join(user_parts)


def build_refine_prompt(
    brand: BrandProfileOut,
    selected_topic: PlaygroundTopic,
    messages: list[PlaygroundMessage],
) -> tuple[str, str]:
    system = (
        "你是中文内容策划助手，帮助用户 refine 已选选题。"
        "用简洁中文回复，给出可执行的调整建议或改写。"
        "若用户满意方向，在回复末尾用一行总结当前理解，格式："
        "【理解】一句话概括当前选题角度。"
    )
    user_parts = [
        f"已选选题: {selected_topic.title}",
        f"理由: {selected_topic.reason}",
        _brand_block(brand),
    ]
    if messages:
        user_parts.append("\n对话历史:")
        for msg in messages:
            role = "用户" if msg.role == "user" else "助手"
            user_parts.append(f"{role}: {msg.content}")
    user_parts.append("\n请继续协助 refine。")
    return system, "\n".join(user_parts)


def parse_topics_json(
    raw: str,
    *,
    min_count: int = 5,
    max_count: int = 10,
) -> list[PlaygroundTopic]:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    data = json.loads(text)
    items = data.get("topics", data) if isinstance(data, dict) else data
    if not isinstance(items, list):
        raise ValueError("topics must be a list")
    topics: list[PlaygroundTopic] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        reason = str(item.get("reason", "")).strip()
        if title and reason:
            topics.append(PlaygroundTopic(title=title[:200], reason=reason[:500]))
    if len(topics) < min_count:
        raise ValueError(f"expected at least {min_count} topics")
    return topics[:max_count]


def extract_understanding(reply: str) -> tuple[str, str | None]:
    marker = "【理解】"
    if marker in reply:
        idx = reply.rfind(marker)
        body = reply[:idx].strip()
        understanding = reply[idx + len(marker) :].strip()
        return body, understanding or None
    return reply.strip(), None


_OUTLINE_JSON_HINT = (
    '格式: {"central_claim": "核心主张", "opening_hook": "开头钩子", '
    '"sections": [{"title": "段落标题", "summary": "要点说明"}], '
    '"closing_cta": "结尾 CTA 或 takeaway"}。sections 必须 3 到 5 条。'
)


def build_outline_generate_prompt(
    brand: BrandProfileOut,
    selected_topic: PlaygroundTopic,
) -> tuple[str, str]:
    system = (
        "你是中文内容策划助手，帮助创作者把选题变成可执行的结构化大纲。"
        "大纲是 pre-pipeline 结构稿，不是完整脚本或正文。"
        "只输出 JSON，不要 markdown 代码块或解释。"
        + _OUTLINE_JSON_HINT
    )
    user_parts = [
        f"已选选题: {selected_topic.title}",
        f"理由: {selected_topic.reason}",
        _brand_block(brand),
        "\n请生成结构化大纲 JSON。",
    ]
    return system, "\n".join(user_parts)


def build_outline_refine_prompt(
    brand: BrandProfileOut,
    selected_topic: PlaygroundTopic,
    outline: PlaygroundOutline,
    messages: list[PlaygroundMessage],
) -> tuple[str, str]:
    system = (
        "你是中文内容策划助手，帮助用户 refine 结构化大纲。"
        "根据用户反馈更新大纲，保持结构化 JSON 输出，不要 markdown 代码块或解释。"
        + _OUTLINE_JSON_HINT
    )
    user_parts = [
        f"已选选题: {selected_topic.title}",
        f"理由: {selected_topic.reason}",
        _brand_block(brand),
        f"\n当前大纲 JSON:\n{outline.model_dump_json()}",
    ]
    if messages:
        user_parts.append("\n对话历史:")
        for msg in messages:
            role = "用户" if msg.role == "user" else "助手"
            user_parts.append(f"{role}: {msg.content}")
    user_parts.append("\n请输出更新后的结构化大纲 JSON。")
    return system, "\n".join(user_parts)


def _extract_json_text(raw: str) -> str:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    return text


def parse_outline_json(raw: str) -> PlaygroundOutline:
    data = json.loads(_extract_json_text(raw))
    if not isinstance(data, dict):
        raise ValueError("outline must be an object")
    central_claim = str(data.get("central_claim", "")).strip()
    opening_hook = str(data.get("opening_hook", "")).strip()
    closing_cta = str(data.get("closing_cta", "")).strip()
    sections_raw = data.get("sections", [])
    if not central_claim or not opening_hook or not closing_cta:
        raise ValueError("outline missing required fields")
    if not isinstance(sections_raw, list):
        raise ValueError("sections must be a list")
    sections: list[PlaygroundOutlineSection] = []
    for item in sections_raw:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        summary = str(item.get("summary", "")).strip()
        if title and summary:
            sections.append(
                PlaygroundOutlineSection(title=title[:200], summary=summary[:1000])
            )
    if len(sections) < 3:
        raise ValueError("expected at least 3 sections")
    return PlaygroundOutline(
        central_claim=central_claim[:500],
        opening_hook=opening_hook[:2000],
        sections=sections[:5],
        closing_cta=closing_cta[:2000],
    )


def format_outline_markdown(outline: PlaygroundOutline) -> str:
    lines = [
        f"## 核心主张\n{outline.central_claim}",
        f"\n## 开头钩子\n{outline.opening_hook}",
        "\n## 段落要点",
    ]
    for index, section in enumerate(outline.sections, start=1):
        lines.append(f"\n### {index}. {section.title}\n{section.summary}")
    lines.append(f"\n## 结尾 CTA\n{outline.closing_cta}")
    return "\n".join(lines)


def format_outline_topic_context(outline: PlaygroundOutline) -> str:
    section_lines = [f"- {section.title}: {section.summary}" for section in outline.sections]
    return "\n".join(
        [
            "## 结构化大纲（来自灵感实验室）",
            f"**主张：** {outline.central_claim}",
            f"**钩子：** {outline.opening_hook}",
            "**要点：**",
            *section_lines,
            f"**结尾：** {outline.closing_cta}",
        ]
    )
