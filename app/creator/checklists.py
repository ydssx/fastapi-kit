from dataclasses import dataclass


@dataclass(frozen=True)
class ChecklistItemDef:
    key: str
    label: str


PLATFORM_LABELS: dict[str, str] = {
    "douyin": "抖音",
    "xiaohongshu": "小红书",
    "wechat": "公众号",
    "bilibili": "B站",
    "weibo": "微博",
}

PLATFORM_CHECKLISTS: dict[str, tuple[ChecklistItemDef, ...]] = {
    "douyin": (
        ChecklistItemDef("vertical", "竖屏 9:16 成片"),
        ChecklistItemDef("title", "标题 ≤ 30 字，含核心关键词"),
        ChecklistItemDef("cover", "封面与标题一致"),
        ChecklistItemDef("tags", "话题标签已添加"),
    ),
    "xiaohongshu": (
        ChecklistItemDef("cover", "封面图清晰、信息完整"),
        ChecklistItemDef("title", "标题吸引点击"),
        ChecklistItemDef("body", "正文分段，首屏有钩子"),
        ChecklistItemDef("tags", "话题与关键词"),
    ),
    "wechat": (
        ChecklistItemDef("title", "公众号标题"),
        ChecklistItemDef("summary", "摘要/导语"),
        ChecklistItemDef("cover", "封面图"),
        ChecklistItemDef("links", "阅读原文/外链检查"),
    ),
    "bilibili": (
        ChecklistItemDef("title", "标题与分区"),
        ChecklistItemDef("cover", "封面"),
        ChecklistItemDef("desc", "简介与标签"),
        ChecklistItemDef("timeline", "时间轴/章节（如适用）"),
    ),
    "weibo": (
        ChecklistItemDef("copy", "文案长度与话题"),
        ChecklistItemDef("media", "图片/视频附件"),
    ),
}


def build_publish_checklist(platform_keys: list[str]) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    for platform in platform_keys:
        label = PLATFORM_LABELS.get(platform, platform)
        defs = PLATFORM_CHECKLISTS.get(platform, ())
        for item in defs:
            items.append(
                {
                    "platform": platform,
                    "platform_label": label,
                    "item_key": item.key,
                    "label": item.label,
                }
            )
    return items
