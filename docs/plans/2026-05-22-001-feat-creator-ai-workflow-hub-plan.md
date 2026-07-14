---
title: "feat: Creator AI workflow hub (C-end MVP)"
type: feat
status: completed
date: 2026-05-22
origin: docs/brainstorms/2026-05-22-creator-ai-workflow-hub-requirements.md
---

# 创作者 AI 创作流水线工作台（C 端 MVP）

## Summary

在同仓新增 **C 端创作者产品**：后端 `/api/v1/creator/*` + 独立 SPA `creator/`（`/creator/`），复用现有 JWT 注册登录与分层架构；用代码内置 2 条 7 步流水线、项目状态机、品牌档案、发布核对与用量配额；AI 通过服务端配置的 OpenAI 兼容 API 按步骤生成。验证期不接支付网关，Pro 由 `users.plan` 手工标记。(see origin: docs/brainstorms/2026-05-22-creator-ai-workflow-hub-requirements.md)

---

## Problem Frame

多平台创作者在多个 AI 工具与笔记间切换，丢失流水线上下文。Origin 要求第一版聚焦固定流水线编排与品牌记忆，不做自动发帖与全平台 BI。(see origin Problem Frame)

---

## Requirements Trace

| ID | 计划单元 | 说明 |
|----|----------|------|
| R1, R1a, R1b | U1 | 流水线注册表（短视频 7 步、长图文 7 步） |
| R2, R3 | U2, U3 | 内容项目创建、列表、当前阶段 |
| R3, R4 | U3, U4 | 步骤产出编辑、确认、版本快照 |
| R5, R6 | U5, U7 | 品牌档案；AI 可跳过 |
| R7, R8 | U6 | 平台槽位与发布 checklist |
| R9 | — | 复用 `app/api/v1/auth/*`（无需新注册体系） |
| R10 | U8 | 月度配额（完整项目 + AI 次数） |
| R11 | U9 | 产品事件埋点（DB 表，供内部分析） |
| F1 | U2, U3, U10 | 从灵感到项目推进 |
| F2 | U5, U7 | 品牌 + AI 辅助 |
| F3 | U6, U10 | 发布核对 |
| AE (R1–R2, R3–R4, R5–R6, R7–R8, R10) | 各单元测试 | 见各单元 Test scenarios |

---

## Scope Boundaries

**In scope（本期）**
- 上述 R1–R11 的 API + `creator/` UI + Alembic 迁移 + Caddy 静态路由
- 配置项：`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`、`CREATOR_FREE_COMPLETED_PROJECTS_PER_MONTH`（默认 2）、`CREATOR_FREE_AI_CALLS_PER_MONTH`（默认 50）、Pro 倍率（默认 10×）

**Deferred for later**（来自 origin）
- 自动发布、平台 API、统一收件箱、表现反馈推荐、自定义流水线编辑器、MCN、自研剪辑引擎、Stripe/微信支付

**Outside this product's identity**
- 扩展 `admin/` 为创作者主界面；通用超级 App

---

## Key Technical Decisions

| 决策 | 理由 |
|------|------|
| 独立前端 **`creator/`**，`base: '/creator/'`，不复用 `admin/` 布局与导航 | Origin 明确 C 端与运维后台产品身份分离；admin 规范面向表格运维 |
| API 前缀 **`/api/v1/creator`**，`CurrentUser` 鉴权，数据按 `user_id` 隔离 | 与 `/admin` 对称；避免 creator 逻辑混入 admin router |
| 流水线定义放 **`app/creator/pipelines.py` 常量**（非用户可配 DB） | R1 禁止无限自定义；减少 v1 迁移与后台配置 |
| **完整项目**判定：流水线全部步骤已确认且用户在发布核对点击 **「完成项目」** | 满足 R10「走完流水线」；比「仅写完脚本」更贴近 F3 |
| 配额按月 **`creator_usage_counters` 表**（`user_id`, `year_month`, `completed_projects`, `ai_calls`） | 可审计、易测；Redis 仅作可选缓存（v1 不必） |
| AI：**服务端统一 LLM 密钥**，同步 HTTP 调用（超时 60s）；步骤 prompt 模板在 `app/creator/prompts/` | 验证期简化 BYOK；长生成后续可改 Celery |
| **Pro 档位**：`users` 表增 `plan` 字段 `free` \| `pro`，验证期内 admin 或脚本提升 | 无支付集成；满足 R10 档位概念 |
| 平台 checklist：**JSON 配置** `app/creator/checklists.py` 按平台 key 映射提醒项 | R8 以文案为主，无 API |
| 产品事件：**`creator_events` 表**（`event_type`, `user_id`, `project_id?`, `payload`） | 满足 R11 最低可行；不建 BI 大屏 |

---

## Open Questions

### Resolved During Planning

- **C 端前端：** 新建 `creator/`，镜像 `admin/` 技术栈（Vite、TanStack Query、CSS Modules、`apiFetch`）。
- **完整项目 / AI 默认额度：** 完成 = 发布核对确认完成；免费 2 项目/月、50 次 AI/月；Pro 默认 20 项目、500 AI（可 env 覆盖）。
- **LLM：** OpenAI 兼容 REST；未配置 `LLM_API_KEY` 时 AI 端点返回明确降级错误（R6 仍允许纯手动）。

### Deferred to Implementation

- Prompt 各步骤中文模板细则与 token 上限截断策略。
- 是否在 U7 对 AI 输出做敏感词过滤（验证期可仅 log）。
- Caddy 生产构建是否并入现有 `Dockerfile.caddy` multi-stage（计划采用与 admin 相同模式）。

---

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

```mermaid
flowchart TB
  subgraph creator_ui [creator SPA /creator/]
    Projects[ProjectsPage]
    Wizard[ProjectWizardPage]
    Brand[BrandProfilePage]
  end
  subgraph api [FastAPI]
    Auth[auth router existing]
    Creator[/api/v1/creator/*]
  end
  subgraph domain [PostgreSQL]
    ProjectsT[content_projects]
    Steps[project_step_artifacts]
    BrandT[creator_brand_profiles]
    Usage[creator_usage_counters]
    Events[creator_events]
  end
  subgraph llm [External LLM]
    OpenAI[OpenAI-compatible API]
  end
  creator_ui --> Auth
  creator_ui --> Creator
  Creator --> domain
  Creator --> OpenAI
```

**核心状态机（`content_projects`）**
- 字段：`pipeline_id`（`short_video` \| `long_article`）、`current_step_key`、`status`（`draft` \| `in_progress` \| `completed`）
- 推进：当前步骤 `confirm` 写入 artifact 快照 → `current_step_key` 前移；最后一步确认后进入 `publish` 子状态（仍 `in_progress`）直至用户「完成项目」→ `completed` 且 `completed_projects` 计数 +1

---

## Implementation Units

### U1. 流水线注册与数据模型（R1, R1a, R1b）

**Goal:** 库表与 2 条 7 步流水线元数据可被 API 读取。

**Requirements:** R1, R1a, R1b

**Dependencies:** None

**Files:**
- Create: `app/creator/__init__.py`, `app/creator/pipelines.py`, `app/creator/checklists.py`
- Create: `app/models/creator.py`（`ContentProject`, `ProjectStepArtifact`, `CreatorBrandProfile`, `CreatorUsageCounter`, `CreatorEvent`）
- Create: `alembic/versions/xxxx_creator_tables.py`
- Modify: `app/models/__init__.py`
- Modify: `app/db/base.py` 或 models 注册处（若存在）
- Test: `tests/api/test_creator_pipelines.py`

**Approach:**
- `pipelines.py`：`PIPELINES: dict[str, PipelineDef]`，每步 `key`, `title`, `description`, `ai_enabled: bool`
- `GET /api/v1/creator/pipelines` 返回流水线列表（无需登录或需登录 — 建议 **需登录** 与项目 API 一致）

**Test scenarios:**
- Happy path: 返回 2 条流水线，短视频 7 步、长图文 7 步 key 顺序正确
- Covers AE R1: 流水线 id 与 origin 阶段名称一致

**Verification:** `pytest tests/api/test_creator_pipelines.py`

---

### U2. 内容项目 CRUD 与阶段推进（R2, R3, F1）

**Goal:** 创建项目、列表/详情、确认步骤并前进。

**Requirements:** R2, R3, F1; Covers AE R1–R2, R3–R4（部分）

**Dependencies:** U1

**Files:**
- Create: `app/schemas/creator.py`, `app/repositories/creator_project.py`, `app/services/creator_project.py`
- Create: `app/api/v1/creator/projects.py`, `app/api/v1/creator/router.py`
- Modify: `app/api/v1/router.py`（`include_router(creator_router, prefix="/creator")`）
- Test: `tests/api/test_creator_projects.py`

**Approach:**
- `POST /projects` body: `pipeline_id`, `title`（选题）, `target_platform_keys[]`
- `GET /projects`, `GET /projects/{id}`
- `PATCH /projects/{id}/steps/{step_key}` body: `content`（草稿，不推进）
- `POST /projects/{id}/steps/{step_key}/confirm`：保存 artifact（U4）+ 推进 `current_step_key`
- 校验：不能跳过未确认步骤；已完成项目只读

**Patterns to follow:** `AdminUserService` 分层；`ApiResponse` 信封

**Test scenarios:**
- Happy path: 创建短视频项目 → 当前步为第一步 → confirm 第一步 → 当前步变为第二步
- Error path: 确认非当前步 → `AppException`
- Covers AE R1–R2: 创建后列表可见，阶段为选题步
- Covers AE R3–R4（部分）: confirm 后上一步内容可 GET 历史

**Verification:** `pytest tests/api/test_creator_projects.py`

---

### U3. 步骤产出版本快照（R3, R4）

**Goal:** 每步至少保留最近一次确认版；可列表查看。

**Requirements:** R3, R4; Covers AE R3–R4

**Dependencies:** U2

**Files:**
- Create: `app/repositories/creator_artifact.py`
- Modify: `app/services/creator_project.py`（confirm 时写入 `project_step_artifacts`）
- Modify: `app/api/v1/creator/projects.py`（`GET .../artifacts` 或详情内嵌）
- Test: `tests/api/test_creator_artifacts.py`

**Approach:**
- 表：`project_id`, `step_key`, `content` (Text), `version` (int 递增), `confirmed_at`
- confirm 时 insert 新 version；草稿 PATCH 可不增 version（仅项目表 `draft_content` JSON 可选，或单独 draft 行 — 实现择一并在 service 注释）

**Test scenarios:**
- Happy path: 同一步两次 confirm（若允许编辑回退则两次）→ 版本列表 ≥1
- Covers AE R3–R4: 确认脚本后进入下一步，历史脚本可查

**Verification:** `pytest tests/api/test_creator_artifacts.py`

---

### U4. 品牌/人设档案（R5, F2）

**Goal:** 用户级品牌配置，供 AI prompt 注入。

**Requirements:** R5, F2; Covers AE R5–R6（部分）

**Dependencies:** U1

**Files:**
- Create: `app/repositories/creator_brand.py`, `app/services/creator_brand.py`
- Create: `app/api/v1/creator/brand.py`
- Test: `tests/api/test_creator_brand.py`

**Approach:**
- 每用户一行：`tone`, `audience`, `taboos`, `structure_notes`（均可 Text / JSON）
- `GET/PUT /api/v1/creator/brand-profile`

**Test scenarios:**
- Happy path: PUT 后 GET 一致
- Covers AE R5: 品牌字段持久化（AI 注入在 U7 测）

**Verification:** `pytest tests/api/test_creator_brand.py`

---

### U5. 平台槽位与发布核对（R7, R8, F3）

**Goal:** 项目绑定平台；发布页 checklist 与手动标记已发。

**Requirements:** R7, R8, F3; Covers AE R7–R8

**Dependencies:** U2

**Files:**
- Modify: `app/models/creator.py`（`target_platforms` JSONB；`publish_checklist_state` JSONB）
- Modify: `app/services/creator_project.py`, `app/api/v1/creator/projects.py`
- Modify: `app/creator/checklists.py`
- Test: `tests/api/test_creator_publish.py`

**Approach:**
- 创建项目时写入平台 keys（预设：douyin, xiaohongshu, wechat, bilibili 等）
- `GET /projects/{id}/publish-checklist` 合并 checklist 模板 + 完成勾选状态
- `PATCH /projects/{id}/publish-checklist` 更新勾选
- `POST /projects/{id}/complete` → status `completed`，触发 U8 计数

**Test scenarios:**
- Covers AE R7–R8: 两平台 checklist 独立勾选，部分已发状态在详情可见

**Verification:** `pytest tests/api/test_creator_publish.py`

---

### U6. AI 步骤辅助（R5, R6, F2）

**Goal:** 按步骤调用 LLM，注入品牌 + 已确认上文；可跳过。

**Requirements:** R5, R6, F2; Covers AE R5–R6

**Dependencies:** U3, U4, U8（配额检查）

**Files:**
- Create: `app/creator/prompts/`（每 pipeline 每 step 模板）
- Create: `app/services/creator_ai.py`, `app/clients/llm.py`（薄封装 httpx）
- Create: `app/api/v1/creator/ai.py`
- Modify: `app/core/config.py`, `.env.example`
- Test: `tests/api/test_creator_ai.py`（mock LLM）

**Approach:**
- `POST /projects/{id}/steps/{step_key}/ai-suggest` → 返回 `{ "suggestion": "..." }`；调用前 `CreatorUsageService.check_ai_quota()`
- 无 `LLM_API_KEY` → `AppException` code `50301` message 明确
- R6：客户端不传 `use_ai` 即手动；服务端仅在有 POST ai-suggest 时扣 ai_calls

**Test scenarios:**
- Happy path: mock LLM 返回固定文本；ai_calls +1
- Error path: 配额用尽 → 402/403 类业务码
- Covers AE R5–R6: 有品牌档案时 prompt 含 taboos；无 AI 调用仍可 confirm

**Verification:** `pytest tests/api/test_creator_ai.py`

---

### U7. 月度用量与 plan 档位（R10）

**Goal:** 免费 2 完整项目/月 + 50 AI/月；Pro 提高上限。

**Requirements:** R10; Covers AE R10

**Dependencies:** U5（complete 触发）, U6

**Files:**
- Modify: `app/models/user.py`（`plan: Mapped[str] default "free"`）
- Create: `app/services/creator_usage.py`
- Create: `app/api/v1/creator/usage.py`
- Modify: `alembic/versions/xxxx_user_plan.py`
- Modify: `app/core/config.py`, `.env.example`
- Test: `tests/api/test_creator_usage.py`

**Approach:**
- `CreatorUsageService.increment_ai()`, `increment_completed()`, `check_*_quota()`
- `GET /creator/usage` 返回本月已用/上限
- 创建项目前检查 `completed` 配额（仅当将创建第 3 个且未完成 — 实际：**完成时**计数，创建不限制草稿数；完成时若超额则拒绝 complete — 与 AE 一致）

**Test scenarios:**
- Covers AE R10: 本月已完成 2 个项目后第 3 次 complete 被拒绝

**Verification:** `pytest tests/api/test_creator_usage.py`

---

### U8. 产品事件（R11）

**Goal:** 记录创建项目、完成项目、7 日内回访可查询。

**Requirements:** R11

**Dependencies:** U2, U5

**Files:**
- Create: `app/services/creator_events.py`
- Modify: project/complete/ai 服务埋点
- Create: `app/api/v1/admin/creator_metrics.py`（可选，仅 admin 只读聚合）或 script `scripts/creator_metrics.py`
- Test: `tests/api/test_creator_events.py`

**Approach:**
- 事件：`project.created`, `project.completed`, `user.session`（登录时）
- 验证期用 **admin 只读 API** `GET /admin/creator-metrics/summary` 返回计数（不暴露给 C 端）

**Test scenarios:**
- Happy path: 创建并完成项目后 summary 计数 ≥1

**Verification:** `pytest tests/api/test_creator_events.py`

---

### U9. Creator 前端 SPA（F1–F3, R2–R8 UI）

**Goal:** 登录、项目列表、向导式流水线、品牌设置、发布核对。

**Requirements:** R2–R8 UI；F1–F3

**Dependencies:** U2–U7 API 就绪

**Files:**
- Create: `creator/`（`vite.config.ts` base `/creator/`, `src/pages/*`, `src/api/*`, `src/auth/*`）
- Create: `creator/FRONTEND.md`（简短，指向 admin 规范同款约定）
- Modify: `docker/Caddyfile`, `docker/Dockerfile.caddy`, `docker-compose.yml`（构建 creator dist）
- Modify: `Makefile`（`creator-dev`, `creator-build`）
- Modify: `AGENTS.md`（C 端启动说明）

**Approach:**
- 页面：`LoginPage`（复用 auth API）、`ProjectsPage`、`ProjectWizardPage`（按 `current_step_key` 渲染表单 + AI 按钮 + 确认）、`BrandProfilePage`、`PublishPage`
- `ProjectWizardPage`：TanStack Query；AI 建议填入 textarea 可编辑；显示 `usage` 余量
- 设计：独立 token，偏创作者工具风格（ce-frontend-design 可在实现阶段过一遍截图）

**Test scenarios:**
- 手动：走完短视频流水线一次；核对发布 checklist

**Verification:** `cd creator && npm run build && tsc -b`

---

### U10. 集成、文档与验证期运营包

**Goal:** 一键 Docker 可访问 `/creator/`；README 与访谈清单。

**Requirements:** 成功标准（验证期）

**Dependencies:** U9

**Files:**
- Modify: `README.md`, `AGENTS.md`
- Create: `docs/creator-validation-playbook.md`（5–10 人访谈脚本、成功指标表）

**Approach:**
- Caddy `handle_path /creator/*` 镜像 admin
- 脚本 `scripts/promote_creator_pro.py` 设置 `plan=pro`

**Verification:** `make up` 后 `https://localhost/creator/` 可打开；`uv run pytest -v` 全绿

---

## Suggested Delivery Order

```
U1 → U2 → U3 → U4 ─┐
         ↓          ├→ U6 → U9 → U10
U5 ← U2 ─┘          │
U7 ← U3,U4,U8       │
U8 ← U5             │
U9 ← U2–U8          │
```

推荐 PR 切分：**(1) U1–U5 后端 + 测试 (2) U6–U8 (3) U9–U10 前端与部署**。

---

## Risks and Mitigations

| 风险 | 缓解 |
|------|------|
| LLM 成本超支 | 默认低免费额度；日志记录 token；验证期监控 `ai_calls` |
| 流水线 UX 过重 7 步 | 前端显示进度条；允许步骤内「暂存」不推进 |
| 与 admin 混淆 | 独立路径与仓库目录；文档明确角色 |
| 无支付仍要 Pro | 手工 `plan` + 脚本；文档写清 |

---

## Verification Checklist（整特性）

- [ ] `uv run ruff check .` / `uv run mypy app` / `uv run pytest -v`
- [ ] `creator` 生产构建通过
- [ ] Origin AE 场景均有 API 测试覆盖
- [ ] `.env.example` 含 LLM 与 creator 配额项
- [ ] `docs/creator-validation-playbook.md` 可供招募试用

---

## Handoff to `ce-work`

执行时从 **U1** 开始，每单元完成后跑对应 `tests/api/test_creator_*.py`。AI 与配额（U6–U7）合并前可用 mock LLM。前端（U9）可在 U2–U5 合并 PR 后用 mock 或并行开发。
