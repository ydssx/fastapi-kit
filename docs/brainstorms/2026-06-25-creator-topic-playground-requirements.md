---
date: 2026-06-25
topic: creator-topic-playground
---

# Creator 选题 Playground（灵感实验室）

## Summary

在 Creator 工作台顶栏增加独立的「灵感实验室」，服务「完全不知道写什么」的用户：首次生成 5–10 条选题清单（短标题 + 一句话理由），选中后在同一页面多轮 refine，满意后通过「进入流水线」创建内容项目并带入已积累上下文。Playground 使用与步骤内 AI 分开计数的独立额度。

（Seeded from ce-ideate: `docs/ideation/2026-06-25-creator-inspiration-ideation.html`, idea「选题 Playground」）

---

## Problem Frame

现有 Creator AI 仅绑定流水线「当前步骤」（`ai-suggest` 要求 `step_key == current_step_key`），用户在决定「做什么」之前没有发散空间，仍依赖外部 ChatGPT 找选题后再手动创建项目。这与 `docs/brainstorms/2026-05-22-creator-ai-workflow-hub-requirements.md` 中 F1「从灵感到流水线项目」的前置环节缺失一致。

---

## Actors

- **A1. 多平台个人创作者**：账户内已有或即将配置品牌档案，处于选题阻塞（空白页）状态。
- **A2. 产品/运营（内部）**：通过 Playground 使用率、handoff 转化率、独立额度消耗验证功能价值。

---

## Key Flows

- **F1. 空白态进入并发散**
  - **Trigger：** 用户从顶栏进入「灵感实验室」，或尚未有进行中的 Playground 会话。
  - **Steps：** 展示空白态说明 → 用户点击「帮我找选题」（或等效 CTA）→ 系统基于品牌档案生成 5–10 条选题卡片 → 用户浏览清单。
  - **Outcome：** 用户在 30 秒内看到多条可执行的选题方向，无需先创建项目。
  - **Covered by：** R1, R2, R3, R4

- **F2. 选中选题并多轮 refine**
  - **Trigger：** 用户从清单中选中一条选题。
  - **Steps：** 进入会话式 refine 区（消息流或等效 UI）→ 用户可用自然语言要求调整（换角度、更窄/更宽、换受众等）→ 系统多轮回应并更新「当前选题理解」→ 用户可随时换选清单中其他条目（重新开始 refine）。
  - **Outcome：** 用户对选题方向感到满意，且上下文留在 Playground 内，无需复制到外部工具。
  - **Covered by：** R5, R6

- **F3. 进入流水线（handoff）**
  - **Trigger：** 用户点击「进入流水线」。
  - **Steps：** 弹出流水线选择（短视频 / 长图文），默认选中用户上次使用的 pipeline → 用户确认 → 系统创建内容项目，将 Playground 累积上下文写入合适步骤的初始草稿（至少选题步；若 refine 中已形成钩子/角度，应写入对应步骤草稿或作为 confirmed context 的 seed，具体字段映射留 planning）→ 跳转项目详情页。
  - **Outcome：** 用户无缝从发散进入既有流水线向导，无上下文断裂。
  - **Covered by：** R7, R8

---

## Requirements

**入口与空白态**
- R1. Creator 顶栏（或主导航）须提供独立入口「灵感实验室」，与「项目」并列可见。
- R2. 首次进入或无进行中会话时，须展示面向「完全空白」的引导 copy 与单一主 CTA（如「帮我找选题」），而非要求用户先创建项目。

**首次生成（选题清单）**
- R3. 用户触发首次生成后，系统须返回 **5–10 条**选题，每条包含 **短标题** 与 **一句话理由**（说明为何适合该用户/品牌）。
- R4. 生成须默认应用用户 **品牌档案**（语气、受众、禁忌、结构偏好）；未配置品牌时 **仍允许生成**，但须展示显著质量警示，并提供跳转「完善品牌档案」的次要 CTA。

**多轮 refine**
- R5. 用户选中一条选题后，须能在 **同一 Playground 页面** 进行 **多轮** refine，直至用户主动点击「进入流水线」；不得强制单轮或立即跳转项目。
- R6. refine 过程中用户须能 **换选** 清单中的其他选题并重置 refine 上下文。

**Handoff 与流水线衔接**
- R7. 用户点击「进入流水线」时，须选择目标流水线（短视频 / 长图文）；默认选中 **上次使用的 pipeline**；无历史时 **不预选**，两种 pipeline 并列展示供用户选择。
- R8. 创建项目时须将 Playground 会话中积累的上下文 **打包注入** 新项目，使用户进入项目详情页时已有可编辑草稿，而非空白编辑器。handoff 时须展示 **映射预览**（哪些内容将写入哪些步骤），并允许用户在确认前编辑注入内容。
- R8a. 最低注入标准：handoff 后 **选题步** 须至少包含短标题（≤100 字）与 1–3 句说明性草稿；若 refine 中已形成钩子/角度，须同步写入对应步骤草稿或作为后续 AI 的默认上下文（精确字段映射留 planning）。

**配额与限额**
- R9. Playground 的 AI 调用须使用 **独立于步骤内 ai-suggest** 的月度额度（单独计数、单独展示）；具体数值留 planning 配置。
- R10. Playground 额度用尽时，须展示明确提示（复用现有 quota UX 模式），允许用户查看已有会话内容但阻止新的生成/refine。
- R10a. Playground 页须在顶栏展示 **独立额度剩余**（如「Playground 额度：12/20 本月」），并与步骤内 AI 额度在 tooltip 中区分说明。

**会话与数据**
- R11. Playground 会话 v1 使用 **sessionStorage（per-tab）** 保持状态；刷新页面 **可能丢失** 未保存内容，须在会话区展示持久提示条，并提供「导出会话 / 保存草稿」入口以降低误丢失风险。
- R12. Playground 会话数据须按用户隔离，不与其他用户共享。

**错误与降级**
- R13. LLM 调用失败或超时时，须展示友好错误文案并允许 **手动重试**（至少 1 次）；连续失败时保留用户已输入/已选选题，不清空会话。

---

## Acceptance Examples

- AE1. **空白态首次生成：** Given 用户已登录且 Playground 有剩余额度，when 进入灵感实验室并点击「帮我找选题」，then 在约 60 秒内展示 5–10 张选题卡片，每张含短标题与一句话理由。
- AE2. **多轮 refine 后 handoff：** Given 用户已选中一条选题并完成至少 2 轮 refine，when 点击「进入流水线」并确认 pipeline 与映射预览，then 创建项目并跳转详情页，选题步编辑器含非空预填内容。
- AE3. **额度用尽：** Given Playground 月度额度为 0，when 用户尝试新的生成或 refine，then 主 CTA 禁用并展示升级/下月重置说明，仍可查看当前会话内容。

---

## Scope Boundaries

**In scope (v1)**
- 顶栏入口、空白态、选题清单、多轮 refine、handoff 创建项目、独立 Playground 额度、品牌档案注入。

**Deferred**
- URL/竞品链接抓取与摘要（ideation #4 → `docs/ideation/2026-06-25-creator-inspiration-ideation.html` #4）。
- 趋势/热点 chip（ideation #7 → 同上 #7）。
- 社区模板 Fork、灵感画廊 Remix（ideation #5/#6 → 同上）。
- 并排多方案面板（ideation #1 → 同上 #1）——可在 Playground 首次清单生成时吸收，但非本需求必需。
- Playground 会话跨设备/长期持久化与「灵感待办」列表。

**Outside product identity**
- 通用 AI 聊天产品（无 handoff、无流水线语义）。
- 自动发帖或外部平台 API 集成。

---

## Key Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| 首要用户状态 | 完全空白 | 用户确认 |
| 首次输出粒度 | 5–10 条选题清单 | 用户确认 |
| refine 深度 | 多轮直到满意 | 用户确认 |
| handoff 时机 | 用户主动「进入流水线」 | 用户确认 |
| 配额 | Playground 独立额度 | 用户确认 |
| 入口 | 顶栏独立入口 | 用户确认 |
| pipeline 选择 | handoff 时选择，默认上次使用 | synthesis call-out 默认 |

---

## Success Criteria

- SC1. 目标创作者能在 **不创建项目** 的情况下，从进入 Playground 到看到选题清单，主路径 **≤ 2 次点击**（进入 + 触发）。
- SC2. Playground → 项目 handoff 后，用户进入项目详情页时 **选题步非空**（至少含短标题 + 1–3 句草稿，见 R8a）。
- SC3. Playground 会话与步骤 AI 的额度在 UI 上 **可区分**，用户理解两类消耗。
- SC4. 验证期追踪：Playground 独立会话数、handoff 转化率（进入流水线 / 完成 refine 会话）、handoff 后项目完成率。

---

## Dependencies & Assumptions

- 依赖现有品牌档案 API 与 LLM 基础设施（`CreatorBrandService`、`LlmClient`）。
- 依赖现有流水线定义与项目创建流程（`CreatorProjectService`）。
- 假设用户已完成注册；品牌档案为空时仍可生成但质量降级。
- 假设 Playground 独立额度在 `CreatorUsageService` 或等价模块中可扩展（planning 定方案）。

---

## Outstanding Questions

- Playground 会话 v1.1 是否升级为服务端持久化（跨刷新/跨设备）——当前 v1 用 sessionStorage + 导出兜底。
- handoff 时上下文到各 pipeline 步骤的 **精确字段映射表**——留 planning 与 prompt 设计（R8a 已定义最低标准）。
- 免费档 Playground 月度额度具体数值——留 planning 与现有商业化对齐。
- 多轮 refine 的 token 压缩/摘要策略——留 planning（成本与体验权衡）。

---

## Relationship to Existing Docs

- 扩展 `docs/brainstorms/2026-05-22-creator-ai-workflow-hub-requirements.md` 的 F1，将「从灵感到项目」拆为 **Playground 发散** + **流水线执行** 两阶段。
- 不修改现有步骤内 `ai-suggest` 语义；Playground 为 **新增** 能力，非替换。
