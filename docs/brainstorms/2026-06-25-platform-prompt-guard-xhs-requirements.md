---
date: 2026-06-25
topic: platform-prompt-guard-xhs
---

# Platform Prompt Guard（小红书平台提示词护栏）

## Summary

当内容项目的目标平台含小红书时，步骤级 AI 建议须感知**主平台**并按步骤注入小红书写作规则（语气 + SEO），使生成草稿从第一步起具备「笔记感」，而非依赖用户手动点 adjustment chip 补救。多平台项目仅应用**用户显式标记的主平台**规则，不并列合并各平台约束。

（Seeded from ce-ideate: `docs/ideation/2026-06-25-xiaohongshu-platform-ideation.html`, idea「Platform Prompt Guard」）

---

## Problem Frame

Creator 的 `build_step_prompt` 仅组合流水线步骤描述与品牌档案，**不接收** `target_platforms`（见 `app/creator/prompts/__init__.py`、`app/services/creator_ai.py`）。小红书发布核对清单（`app/creator/checklists.py`）中的「首屏钩子」「话题关键词」等标准只出现在 publish 步，AI 生成阶段平台无关。前端 `STEP_AI_ADJUSTMENTS` 的「更口语」「更 SEO」成为唯一补救手段，增加操作负担且不一致。

---

## Actors

- **A1. 小红书为主平台的创作者**：创建或编辑项目时明确主平台为小红书，期望 AI 草稿可直接微调后发布。
- **A2. 多平台创作者**：同时勾选小红书与公众号等，但希望 AI 按**单一主平台**风格生成，避免混杂规则。
- **A3. 产品/运营（内部）**：通过 adoption 率、publish 步返工率、adjustment chip 使用下降验证效果。

---

## Key Flows

- **F1. 创建项目并标记主平台**
  - **Trigger：** 用户在新建/编辑项目时选择目标平台。
  - **Steps：** 在 PlatformPicker 中多选目标平台 → **显式单选「主平台」**（须为已选目标平台之一）→ 保存项目。
  - **Outcome：** 项目持久化 `target_platform_keys` 与 `primary_platform_key`（命名留 planning），AI 后续调用可读主平台。
  - **Covered by：** R1, R2, R3

- **F2. 步骤内 AI 建议（主平台 = 小红书）**
  - **Trigger：** 用户在含 AI 的步骤请求建议（含 auto-suggest）。
  - **Steps：** 系统读取主平台 → 若为 `xiaohongshu`，按**当前步骤**注入对应 XHS 规则块（语气 + SEO）→ 与品牌档案、已确认上文合并 → 返回草稿。
  - **Outcome：** 草稿具备口语分段、首屏钩子意识、关键词/标签意识，减少 publish 步 checklist 未达标。
  - **Covered by：** R4, R5, R6, R7

- **F3. 多平台项目（主平台 ≠ 小红书）**
  - **Trigger：** 项目含小红书但主平台设为公众号（或其他）。
  - **Steps：** AI 注入**主平台**规则；小红书规则不生效。
  - **Outcome：** 生成风格与主平台一致，用户可在 seo/标题步手动为小红书另做变体（不在本需求范围）。
  - **Covered by：** R8

---

## Requirements

**主平台选择与持久化**

- R1. 项目创建与编辑 UI（PlatformPicker 区域）须提供 **主平台单选**，选项限定为已勾选的 `target_platform_keys`；未选目标平台时不得设置主平台。
- R2. 保存项目时须持久化主平台 key；若目标平台列表变更导致主平台不在列表内，须 **清空主平台** 并提示用户重新选择（或自动降级为列表第一项——具体交互留 planning，须二选一并写入 AE）。
- R3. 新建项目时：若用户仅选小红书，主平台 **默认** 为小红书；若多选且未手动改主平台，须 **阻止保存** 或 **强制选择**（不得静默假设第一个）。

**平台规则注入（主平台 = 小红书）**

- R4. 当主平台为 `xiaohongshu` 时，所有 **ai_enabled** 步骤的 AI 建议 prompt 须注入小红书 **语气层** 规则：口语化、短句分段、适度 Emoji（非堆砌）、首屏/开头须有吸引点。
- R5. 在上述基础上须注入 **SEO 层** 规则：核心关键词尽量前置（标题/开头）、意识到的搜索与话题标签场景；不要求输出固定标签格式（结构化 5-3-2 属 ideation #3，非本需求）。
- R6. 规则须 **按步骤差异化** 注入，至少覆盖两条流水线中的下列映射（规则文案可配置化，语义须保留）：

  | 流水线 | 步骤 key | 强调点 |
  |--------|----------|--------|
  | short_video | hook, script | 开头 3 秒/首句钩子；口播口语化 |
  | short_video | cover_title | 标题吸引点击；关键词前置 |
  | long_article | body | 首段钩子；分段清晰 |
  | long_article | title_summary | 标题 SEO + 点击；摘要含关键词 |
  | long_article | seo_variants | 话题/关键词利于小红书搜索 |
  | 共用 | topic, outline, storyboard, visuals, production_notes | 语气层总则；不强行 SEO 除非步骤描述已含 |

- R7. 用户通过 adjustment chip 提交的「额外要求」须 **叠加** 于平台规则之后，不得被平台规则覆盖。

**多平台与边界**

- R8. 当主平台 **不是** 小红书时，**不得** 注入小红书专用规则，即使 `target_platform_keys` 含小红书。
- R9. 本需求 **不包含** 一次生成多平台变体、不并列合并多平台规则、不修改 publish checklist 本身（量化核对属 ideation #4）。
- R10. `publish` 步（ai_enabled=false）不调用本逻辑；平台规则仅影响 AI 建议路径。

**可观测与兼容**

- R11. AI 建议响应（或前端 AiSuggestionPanel 来源说明）须能让用户看到建议 **基于主平台**（如已有「基于：品牌档案 · 步骤 · 小红书」模式则扩展为主平台标签）。
- R12. 须保持与现有品牌 `taboos` 注入兼容；平台规则不得 contradict 用户禁忌（禁忌优先）。

---

## Acceptance Examples

- **AE1. 单平台小红书短视频**
  - **Covers R1, R4, R6.**
  - **Given** 用户创建短视频项目，目标平台仅小红书且主平台为小红书，
  - **When** 用户在「口播脚本」步请求 AI 建议，
  - **Then** 返回草稿为口语化分段文本，开头含明确钩子；prompt 构建路径包含小红书语气规则（可经测试或日志断言）。

- **AE2. 多平台主平台为公众号**
  - **Covers R8.**
  - **Given** 目标平台为小红书 + 公众号，主平台为公众号，
  - **When** 用户在「正文」步请求 AI 建议，
  - **Then** 注入的是公众号取向规则（或通用规则），**不含** 小红书 SEO/笔记感专用块。

- **AE3. 主平台未选阻止保存**
  - **Covers R3.**
  - **Given** 用户勾选抖音 + 小红书两个目标平台，未选择主平台，
  - **When** 用户尝试保存项目，
  - **Then** 展示校验错误并要求选择主平台，项目未保存。

- **AE4. adjustment 叠加**
  - **Covers R7.**
  - **Given** 主平台为小红书，用户在脚本步点击「更短」adjustment，
  - **When** AI 返回建议，
  - **Then** 草稿仍符合小红书语气/钩子要求，且明显短于无 adjustment 的默认输出。

---

## Success Criteria

- 主平台为小红书的项目，publish 步 checklist 中「正文分段，首屏有钩子」「标题吸引点击」的 **首次 AI 草稿达标率** 相对基线提升（基线测量方式留 planning，可用内部试用采样）。
- 同条件下，脚本/正文步 **「更口语」「更 SEO」adjustment chip 使用率** 下降（用户无需补丁式补救）。
- 无回归：非小红书主平台项目的 AI 输出质量不被小红书规则污染（AE2 类场景通过测试）。

---

## Scope Boundaries

**Deferred for later**

- 结构化 5-3-2 标签 JSON 输出（ideation #3）
- Checklist 规则反向注入 prompt 的单源真相（ideation #2）
- 量化发布核对（字数/比例计数，ideation #4）
- 非小红书主平台的专用规则库（抖音/公众号 prompt guard）

**Outside this feature**

- 小红书 API 自动发布
- 敏感词扫描层（ideation #6）
- 新建 `xhs_note` 专用流水线（ideation #7）

---

## Dependencies / Assumptions

- 依赖现有 `target_platforms` 项目字段与 AI 建议 API；需新增 `primary_platform_key`（或等价字段）及迁移。
- 假设 LLM 在追加规则块后仍稳定输出「可直接使用的正文」而非解释性文字（与现有 system prompt 一致）。
- 小红书规则文案 v1 由产品/运营提供常量表，非实时抓取平台政策。

---

## Outstanding Questions

**Resolve Before Planning**

- R2 主平台在目标列表变更后的自动行为：清空并提示 vs 自动选第一项——需在 planning 前定案（影响 API 与 UI）。

**Deferred to Planning**

- `primary_platform_key` 字段命名、是否允许 null、历史项目回填策略。
- 各步骤 XHS 规则块的精确文案与存放位置（代码常量 vs 配置文件）。
- 是否需要 admin 可配置规则表（v1 建议硬编码以降低范围）。

---

## Sources / Research

- `app/creator/prompts/__init__.py` — 当前 platform-blind prompt 构建
- `app/services/creator_ai.py` — AI 建议入口，未传 platforms
- `app/creator/checklists.py` — 小红书核对项语义来源
- `creator/src/lib/stepAiAdjustments.ts` — 现有补救 chip
- `docs/ideation/2026-06-25-xiaohongshu-platform-ideation.html` — #1 Platform Prompt Guard
- 外部：2025-2026 小红书标题关键词前置、口语笔记体、3-5 标签搜索习惯（见 ideation grounding）
