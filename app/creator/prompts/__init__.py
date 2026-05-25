from app.creator.pipelines import get_pipeline


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
    user_parts.append(f"\n请生成「{step.title}」内容。")
    return system, "\n".join(user_parts)
