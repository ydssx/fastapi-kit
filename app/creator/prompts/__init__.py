from app.creator.pipelines import get_pipeline
from app.creator.platform_prompts import build_platform_prompt_section


def build_step_prompt(
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
    pipeline = get_pipeline(pipeline_id)
    step = next(s for s in pipeline.steps if s.key == step_key)
    system = (
        "你是中文内容创作助手。根据品牌约束与已确认的上文，生成本步骤草稿。"
        "输出可直接使用的正文，不要解释过程。"
    )
    user_parts = [
        f"流水线: {pipeline.title}",
        f"当前步骤: {step.title} — {step.description}",
        f"选题: {project_title}",
    ]
    if brand_tone or brand_audience or brand_taboos or brand_structure:
        user_parts.append(
            f"\n品牌语气: {brand_tone}\n受众: {brand_audience}\n禁忌: {brand_taboos}"
            f"\n结构偏好: {brand_structure}"
        )
    if context.strip():
        user_parts.append(f"\n已确认上文:\n{context}")
    platform_section = build_platform_prompt_section(
        primary_platform_key=primary_platform_key,
        pipeline_id=pipeline_id,
        step_key=step_key,
    )
    if platform_section:
        user_parts.append(platform_section)
    user_parts.append(f"\n请生成「{step.title}」内容。")
    if adjustment:
        user_parts.append(f"\n额外要求: {adjustment}")
    return system, "\n".join(user_parts)


def build_selection_rewrite_prompt(
    *,
    pipeline_id: str,
    step_key: str,
    project_title: str,
    brand_tone: str,
    brand_audience: str,
    brand_taboos: str,
    brand_structure: str,
    context: str,
    draft_content: str,
    selected_text: str,
    primary_platform_key: str | None = None,
    adjustment: str | None = None,
) -> tuple[str, str]:
    pipeline = get_pipeline(pipeline_id)
    step = next(s for s in pipeline.steps if s.key == step_key)
    system = (
        "你是中文内容创作助手。根据品牌约束与上下文，只改写用户选中的片段。"
        "只输出改写后的选中片段本身，不要输出整篇草稿，不要加引号或解释。"
    )
    user_parts = [
        f"流水线: {pipeline.title}",
        f"当前步骤: {step.title} — {step.description}",
        f"选题: {project_title}",
    ]
    if brand_tone or brand_audience or brand_taboos or brand_structure:
        user_parts.append(
            f"\n品牌语气: {brand_tone}\n受众: {brand_audience}\n禁忌: {brand_taboos}"
            f"\n结构偏好: {brand_structure}"
        )
    if context.strip():
        user_parts.append(f"\n已确认上文:\n{context}")
    platform_section = build_platform_prompt_section(
        primary_platform_key=primary_platform_key,
        pipeline_id=pipeline_id,
        step_key=step_key,
    )
    if platform_section:
        user_parts.append(platform_section)
    if draft_content.strip():
        user_parts.append(f"\n当前步骤全文（供连贯性参考）:\n{draft_content}")
    user_parts.append(f"\n需要改写的选中片段:\n{selected_text}")
    user_parts.append("\n请只输出改写后的选中片段。")
    if adjustment:
        user_parts.append(f"\n额外要求: {adjustment}")
    return system, "\n".join(user_parts)
