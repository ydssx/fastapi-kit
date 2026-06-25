"""Platform-specific AI prompt sections for creator step suggestions."""

XHS_VOICE_RULES = (
    "小红书笔记风格：口语化、短句分段、适度使用 Emoji（勿堆砌）、"
    "开头/首屏须有吸引点。遵守品牌禁忌，不得使用禁忌表述。"
)

XHS_SEO_RULES = (
    "小红书搜索优化：核心关键词尽量前置（标题或开头）；"
    "意识到的搜索意图与话题标签场景，便于用户后续添加话题。"
)

_STEP_EMPHASIS: dict[tuple[str, str], str] = {
    ("short_video", "hook"): "强调开头 3 秒/首句钩子，口播提纲口语化。",
    ("short_video", "script"): "强调开头 3 秒/首句钩子，口播稿口语化、可分段朗读。",
    ("short_video", "cover_title"): "标题须吸引点击，核心关键词尽量放在标题前 10 字内。",
    ("long_article", "body"): "首段须有钩子；正文分段清晰，便于手机阅读。",
    ("long_article", "title_summary"): "标题兼顾 SEO 与点击；摘要/导语含核心关键词。",
    ("long_article", "seo_variants"): "话题与关键词利于小红书搜索；可给出标题变体与标签方向。",
}


def xhs_step_emphasis(pipeline_id: str, step_key: str) -> str | None:
    return _STEP_EMPHASIS.get((pipeline_id, step_key))


def build_platform_prompt_section(
    *,
    primary_platform_key: str | None,
    pipeline_id: str,
    step_key: str,
) -> str:
    if primary_platform_key != "xiaohongshu":
        return ""

    parts = [
        "\n【平台写作要求 · 小红书（主平台）】",
        XHS_VOICE_RULES,
        XHS_SEO_RULES,
    ]
    emphasis = xhs_step_emphasis(pipeline_id, step_key)
    if emphasis:
        parts.append(f"本步骤侧重：{emphasis}")
    return "\n".join(parts)
