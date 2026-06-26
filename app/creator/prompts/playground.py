import json
import re

from app.schemas.creator import BrandProfileOut, PlaygroundMessage, PlaygroundTopic


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
