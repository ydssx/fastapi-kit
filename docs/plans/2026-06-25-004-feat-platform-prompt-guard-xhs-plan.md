---
title: "feat: Platform Prompt Guard (小红书平台提示词护栏)"
type: feat
status: completed
date: 2026-06-25
origin: docs/brainstorms/2026-06-25-platform-prompt-guard-xhs-requirements.md
---

# Platform Prompt Guard（小红书平台提示词护栏）

## Summary

为 Creator 内容项目新增 `primary_platform_key` 持久化与 UI 主平台选择；当主平台为小红书时，在 `build_step_prompt` 按流水线步骤注入语气 + SEO 规则块，使 AI 建议从生成阶段即平台定向。多平台项目仅应用主平台规则，不并列合并。(see origin: docs/brainstorms/2026-06-25-platform-prompt-guard-xhs-requirements.md)

---

## Problem Frame

`build_step_prompt` 与 `CreatorAiService.suggest` 不感知目标/主平台；小红书 checklist 规则仅用于 publish 步。用户依赖 adjustment chip 补救「笔记感」。(see origin Problem Frame)

---

## Requirements Trace

| ID | 单元 | 说明 |
|----|------|------|
| R1, R3 | U2, U4 | 主平台 UI 单选；单平台默认 |
| R2 | U1, U2 | 平台列表变更时清空无效主平台 |
| R3 | U2, U4 | 多平台未选主平台 → API 400 |
| R4, R5, R6, R7 | U3 | XHS 语气 + SEO + 分步骤规则 |
| R8 | U3, U5 | 非 XHS 主平台不注入 XHS 块 |
| R10 | U3 | publish 步无 AI，不受影响 |
| R11 | U4 | 前端 source 展示主平台 |
| R12 | U3 | taboos 优先，平台规则不覆盖禁忌 |
| AE1–AE4 | U5 | API 测试 |

---

## Key Technical Decisions

| 决策 | 理由 |
|------|------|
| 字段名 **`primary_platform_key`**（nullable `String(50)`） | 与 API `target_platform_keys` 命名对称；单元素 JSONB 数组不表达「主」语义 |
| **R2 定案：目标平台变更导致主平台不在列表内 → 清空 `primary_platform_key`** | 与 checklist 重置一致；避免静默错误主平台；用户下次编辑须重选（多平台时） |
| **历史回填：仅当 `target_platforms` 长度为 1 时设为该 key** | 多平台历史项目保持 null，编辑时强制选择 |
| **单平台创建/更新：自动设主平台为该唯一 key** | 满足 R3 默认行为，无需 UI 额外交互 |
| **XHS 规则模块 `app/creator/platform_prompts.py`** | 与 `checklists.py` 并列；v1 硬编码常量，按 `(pipeline_id, step_key)` 映射强调点 |
| **规则注入位置：user prompt 段「平台写作要求」** | system 保持通用；adjustment 仍追加在最后（R7） |
| **非 XHS 主平台：不注入任何平台专用块（v1）** | origin Deferred：其他平台 Prompt Guard 后续再做；满足 R8/AE2 |

---

## Scope Boundaries

**In scope:** U1–U5 全部；creator 前端主平台选择与 source 展示。

**Deferred:** 5-3-2 标签 JSON、checklist 单源、量化核对、其他平台规则库（见 origin）。

**Outside:** 自动发布、敏感词扫描、xhs_note 新流水线。

---

## Implementation Units

### U1. 数据模型与迁移

**Goal:** `content_projects.primary_platform_key` 可持久化。

**Files:**
- Create: `alembic/versions/007_add_primary_platform_key.py`
- Modify: `app/models/creator.py`
- Modify: `app/schemas/creator.py` (`ProjectCreate`, `ProjectUpdate`, `ProjectOut`)

**Approach:**
- 新增 nullable 列；migration 回填单平台项目。
- Schema：`primary_platform_key: str | None`；Create/Update 可选。

**Test scenarios:**
- Migration applies on fresh DB (via existing test fixtures).

---

### U2. 项目服务校验与序列化

**Goal:** 创建/更新时主平台合法性；平台变更清空无效主平台。

**Files:**
- Modify: `app/services/creator_project.py`

**Approach:**
- `_normalize_platforms(user, payload)` 辅助：
  - 单平台 → auto primary
  - 多平台 → 必须提供 primary 且在列表内，否则 400 (code 40025)
  - 更新 platforms 后若 primary 不在列表 → 置 null
- `_to_out` 返回 `primary_platform_key`

**Test scenarios:**
- Create multi-platform without primary → 400 (AE3)
- Create single xiaohongshu → primary auto-set
- Update platforms removing primary → primary cleared
- Covers R2, R3

**Test file:** `tests/api/test_creator_projects.py`

---

### U3. 平台 Prompt 规则与 build_step_prompt

**Goal:** 主平台 xiaohongshu 时按步骤注入规则。

**Files:**
- Create: `app/creator/platform_prompts.py`
- Modify: `app/creator/prompts/__init__.py`
- Modify: `app/services/creator_ai.py`

**Approach:**
- `platform_prompts.py`：
  - `XHS_VOICE_RULES` 语气层常量
  - `XHS_SEO_RULES` SEO 层常量
  - `xhs_step_emphasis(pipeline_id, step_key) -> str | None` 分步骤强调
  - `build_platform_prompt_section(primary_platform_key, pipeline_id, step_key) -> str`
- `build_step_prompt(..., primary_platform_key: str | None)` 追加 section
- `creator_ai.suggest` 传入 `project.primary_platform_key`

**Test scenarios:**
- XHS primary + script step → user_prompt 含「小红书」与钩子/口语关键词
- wechat primary + body step → user_prompt 不含 XHS 专用块
- adjustment 仍在 prompt 末尾
- Covers AE1, AE2, AE4, R4–R8

**Test file:** `tests/api/test_creator_ai.py` (new tests with fake_complete capture)

---

### U4. Creator 前端主平台 UX

**Goal:** PlatformPicker 支持主平台单选；创建/编辑传 API；AI source 展示主平台。

**Files:**
- Modify: `creator/src/components/PlatformPicker.tsx`, `PlatformPicker.module.css`
- Modify: `creator/src/pages/ProjectsPage.tsx`
- Modify: `creator/src/pages/ProjectDetailPage.tsx`
- Modify: `creator/src/api/creator.ts`, `creator/src/types/api.ts`

**Approach:**
- PlatformPicker 增加 `primaryKey` / `onPrimaryChange`；已选平台内 radio 样式「主平台」
- 取消选中某平台时若其为 primary → 清空 primary
- ProjectsPage：`primaryPlatform` state；多平台时 canCreate 需 primary 已选
- ProjectDetailPage：编辑区同步 primary；`sourceParts` 用 `platformLabels([primary])` 或 fallback
- updateProject/createProject 传 `primary_platform_key`

**Test scenarios:** Manual / browser (ce-test-browser pipeline)

---

### U5. 测试辅助与回归

**Goal:** 更新 helpers；全量 creator API 测试通过。

**Files:**
- Modify: `tests/api/creator_helpers.py`
- Modify: `tests/api/test_creator_projects.py`, `tests/api/test_creator_ai.py`

**Approach:**
- `create_short_video_project(..., primary_platform_key=...)` 
- 默认 helper 保持双平台 + 显式 primary xiaohongshu 避免破坏现有测试

---

## Open Questions

### Resolved During Planning

- **R2:** 主平台不在新列表 → 清空（非自动选第一项）。
- **历史回填:** 仅单平台项目自动设 primary。

### Deferred to Implementation

- XHS 规则中文案微调（产品 copy 迭代，不影响结构）。

---

## Verification

```bash
uv run pytest tests/api/test_creator_projects.py tests/api/test_creator_ai.py -v
uv run ruff check app/creator app/services/creator_ai.py app/services/creator_project.py
```
