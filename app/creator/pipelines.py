from dataclasses import dataclass


@dataclass(frozen=True)
class PipelineStepDef:
    key: str
    title: str
    description: str
    ai_enabled: bool


@dataclass(frozen=True)
class PipelineDef:
    id: str
    title: str
    description: str
    steps: tuple[PipelineStepDef, ...]


SHORT_VIDEO_STEPS: tuple[PipelineStepDef, ...] = (
    PipelineStepDef("topic", "选题", "明确本期视频主题与受众价值", True),
    PipelineStepDef("hook", "钩子/提纲", "开头钩子与内容结构提纲", True),
    PipelineStepDef("script", "口播脚本", "完整口播稿，可分段", True),
    PipelineStepDef("storyboard", "分镜/画面要点", "镜头与画面说明", True),
    PipelineStepDef("cover_title", "封面/标题", "封面文案与平台标题备选", True),
    PipelineStepDef(
        "production_notes",
        "素材与剪辑备注",
        "B-roll、素材清单与剪辑注意点",
        True,
    ),
    PipelineStepDef("publish", "发布核对", "各平台发布 checklist，确认后完成项目", False),
)

LONG_ARTICLE_STEPS: tuple[PipelineStepDef, ...] = (
    PipelineStepDef("topic", "选题", "文章主题与核心观点", True),
    PipelineStepDef("outline", "大纲", "章节结构与论证逻辑", True),
    PipelineStepDef("body", "正文", "完整正文草稿", True),
    PipelineStepDef("title_summary", "标题/摘要", "标题与摘要/导语", True),
    PipelineStepDef("visuals", "配图要点", "配图位置与说明", True),
    PipelineStepDef(
        "seo_variants",
        "关键词与多平台标题",
        "关键词、话题标签、各平台标题变体",
        True,
    ),
    PipelineStepDef("publish", "发布核对", "各平台发布 checklist，确认后完成项目", False),
)

PIPELINES: dict[str, PipelineDef] = {
    "short_video": PipelineDef(
        id="short_video",
        title="短视频",
        description="偏制作的短视频流水线，从选题到发布核对",
        steps=SHORT_VIDEO_STEPS,
    ),
    "long_article": PipelineDef(
        id="long_article",
        title="长图文",
        description="偏传播的长图文流水线，含 SEO 与多平台标题",
        steps=LONG_ARTICLE_STEPS,
    ),
}


def get_pipeline(pipeline_id: str) -> PipelineDef:
    pipeline = PIPELINES.get(pipeline_id)
    if pipeline is None:
        raise KeyError(pipeline_id)
    return pipeline


def first_step_key(pipeline_id: str) -> str:
    return get_pipeline(pipeline_id).steps[0].key


def step_index(pipeline_id: str, step_key: str) -> int:
    keys = [s.key for s in get_pipeline(pipeline_id).steps]
    return keys.index(step_key)


def next_step_key(pipeline_id: str, step_key: str) -> str | None:
    pipeline = get_pipeline(pipeline_id)
    idx = step_index(pipeline_id, step_key)
    if idx + 1 >= len(pipeline.steps):
        return None
    return pipeline.steps[idx + 1].key
