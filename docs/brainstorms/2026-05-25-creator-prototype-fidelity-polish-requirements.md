---
date: 2026-05-25
topic: creator-prototype-fidelity-polish
---

# 创作者工作台原型对齐 Polish

## Summary

在现有 Creator MVP 功能不变的前提下，将 `creator/` SPA 的 UI 对齐至 `creator/docs/prototypes/` 中 8 张高保真参考图所表达的信息结构与视觉语言，并补齐原型 README 列出的未生成边界态（移动端窄屏、配额用尽、AI loading 增强等）；采用设计系统先行、逐页替换的交付顺序，无后端支撑的装饰元素以占位或省略处理。

---

## Problem Frame

Creator 工作台 MVP 已具备完整业务链路（登录、项目、7 步流水线、品牌档案、发布核对、配额），但当前实现与高保真原型在布局层级、组件形态、变体态与边界态上存在明显差距。团队在验证招募前希望以原型为单一视觉参考，减少「实现与 mockup 各说各话」的评审成本；若逐页零散改 CSS，易出现顶栏、步骤条、卡片样式不一致，后续合并返工。本次 polish 不改变产品行为与 API 契约，只提升 UI 与原型的一致度，为后续验证试用提供可信赖的第一印象。

---

## Actors

- A1. **多平台个人创作者（C 端用户）**：在创作者工作台中完成登录、建项、走流水线、配置品牌档案。
- A2. **产品/设计（内部）**：以 `creator/docs/prototypes/` 为验收参考，评审 polish 是否达标。

---

## Key Flows

- F1. **核心页面浏览与操作**
  - **Trigger：** 用户打开 Creator 任一已 polish 页面并完成常规操作（登录、建项、推进步骤、保存品牌、发布核对）。
  - **Actors：** A1
  - **Steps：** 页面加载 → 视觉布局与原型参考一致 → 用户完成与 MVP 相同的交互 → 变体态/边界态在对应条件下正确呈现。
  - **Outcome：** 功能行为与 polish 前一致；视觉与信息层级符合原型参考。
  - **Covered by：** R1–R8, R10

- F2. **边界态触达**
  - **Trigger：** 用户处于空项目列表、项目已完成、配额用尽、AI 生成中、或窄屏视口。
  - **Actors：** A1
  - **Steps：** 系统识别状态 → 展示对应变体/边界 UI → 用户可理解当前限制并知道下一步（升级提示、等待、或继续可用操作）。
  - **Outcome：** 边界态不呈现为裸错误或未样式化占位。
  - **Covered by：** R5–R9

---

## Requirements

**设计基础与共享组件**
- R1. 须统一 Creator 设计 token（背景 `#0c0f14`、强调色 `#f2b84b`、完成态 `#4ade80`、字体 DM Sans 等），与 `creator/docs/prototypes/README.md` 设计要点一致，并在共享样式/组件中复用，避免各页重复定义。
- R2. 须提炼并复用跨页共享 UI 模式：顶栏（品牌、导航、配额、用户）、圆形/编号步骤进度条、项目卡片、表单字段（含图标输入框样式）、空态区块、配额展示、主/次/幽灵按钮组。
- R3. 交付顺序须为：**共享 shell 与 token → 核心四页 → 变体态与边界态**；后一阶段不得阻塞前一阶段已交付页面的功能回归。

**核心四页（对应 4 张主原型）**
- R4. **登录/注册页**须对齐 `prototype-login.png`：左右分栏（价值主张 + 表单卡片）、登录/注册切换、表单层级与按钮样式；「忘记密码」若无后端支持须为禁用态或省略，不得链向无效流程。
- R5. **项目列表页**须对齐 `prototype-projects.png` 与 `prototype-projects-empty.png`：新建项目表单布局、平台选择形态、进行中项目卡片（含进度表达）；空列表时须呈现专用空态（非仅一行 muted 文案）。
- R6. **项目详情/向导页**须对齐 `prototype-project-detail.png`：顶栏元信息、步骤进度、当前步骤面板、已确认步骤历史区；须同时覆盖短视频与长图文流水线（见 R7）。
- R7. **长图文向导某步**须对齐 `prototype-long-article.png` 的布局与层级（至少一步正文阶段作为验收代表）。
- R8. **品牌档案页**须对齐 `prototype-brand.png`：四字段表单、字数提示、保存操作与说明文案；原型中无后端支撑的多级侧栏导航不落地，保留与现网一致的顶栏导航即可。

**变体态（对应 4 张变体原型）**
- R9. **发布核对**须对齐 `prototype-publish-checklist.png`：checklist 分组/层级、完成项目 CTA 区域。
- R10. **项目完成态**须对齐 `prototype-project-completed.png`：完成 banner、已确认步骤归档展示。
- R11. 上述变体态须在用户进入对应业务状态时自动呈现，不要求额外路由或演示开关。

**边界态（原型 README 未生成项）**
- R12. **配额用尽**：当完成项目数或 AI 次数触达上限时，须在相关操作点（侧边栏配额区、创建/完成/AI 触发处）呈现明确、可理解的升级/限制提示，而非仅 API 错误字符串。
- R13. **AI 建议生成中**须有明显 loading 反馈（不仅按钮文案变化），风格与整体暗色编辑室一致。
- R14. **移动端窄屏**（视口约 ≤640px）须保证核心四页可读写可用：顶栏可折叠或堆叠、表单与步骤条不横向溢出、主要 CTA 可触达；不要求 tablet/desktop 以上额外 breakpoint 优化。

**行为与范围约束**
- R15. Polish 不得改变现有 API 契约、业务状态机与配额规则；不得新增需后端支持的字段（如项目缩略图上传、预计发布日期持久化）除非单独立项。
- R16. 原型中纯装饰且无数据源的视觉元素（如项目卡片摄影缩略图、详情页 ETA 日期）须使用**流水线类型占位图/渐变或省略**，并在验收说明中标注与 mock 的已知差异。

---

## Acceptance Examples

- AE1. **Covers R5.** Given 用户已登录且项目列表为空，when 打开项目页，then 展示与 `prototype-projects-empty.png` 语义一致的空态引导（含指向新建表单的视觉层次），而非单行灰色提示。
- AE2. **Covers R12.** Given 免费档用户本月已完成项目数已达上限，when 尝试完成新项目或触发会消耗完成额度的操作，then 展示配额用尽专用 UI（含升级/限制说明），且不因 polish 引入静默失败。
- AE3. **Covers R13.** Given 用户在任一步骤点击 AI 建议，when 请求进行中，then 页面呈现可见 loading 状态（如步骤区 overlay 或专用指示），请求结束后恢复可编辑。
- AE4. **Covers R14, R16.** Given 视口宽度 ≤640px，when 用户在项目详情页操作，then 步骤条与主编辑区无横向滚动条导致的不可读，且不要求项目卡片展示真实上传缩略图。
- AE5. **Covers R15.** Given polish 已全部合并，when 运行现有 Creator API 测试套件，then 全部通过（UI 变更不破坏契约）。

---

## Success Criteria

- **人类结果：** A2 对照 8 张原型 + README 边界态清单逐项验收，核心四页与变体态在布局/组件形态上「一眼可对应」参考图；已知无后端项（缩略图、忘记密码、ETA、品牌侧栏）有 documented 差异列表。
- **下游交付：** `ce-plan` 可直接按 R1–R3 的交付顺序拆任务，无需再发明「对齐到什么程度、哪些 mock 元素落地」；Outstanding Questions 中技术项可在 planning 阶段解决。

---

## Scope Boundaries

- 创作者 **新流水线、新 API、AI prompt 改版、支付集成**
- **验证招募与访谈执行**（`docs/creator-validation-playbook.md` 已有，本次不做运营）
- Admin / 运维 / 后端工程质量（除非 polish 暴露必须修的小 bug）
- 原型背景中出现但产品未定义的页面（如数据看板、素材库、粉丝互动等 mock 导航项）
- **像素级 1:1** 复刻（以布局与组件级对齐为准）
- 为对齐原型而 **新增后端字段或上传能力**（项目封面图、发布日期等）

---

## Key Decisions

- **推进策略：** 设计系统先行（方案 A），再逐页对齐；不用截图驱动逐张 PR 作为主策略，以避免 CSS 重复与后期统一返工。
- **对齐深度：** 布局、视觉层级、组件形态、关键文案风格一致；不要求像素级 1:1。
- **无后端 mock 元素：** 缩略图、ETA、忘记密码、品牌页多级侧栏 — 占位/省略/禁用，不扩 API。
- **验证顺序：** 本次 polish 完成后，再进入 5–10 人验证试用（接受 deliberate 延后验证）。
- **参考源：** `creator/docs/prototypes/` 8 张 PNG + `README.md` 为唯一 UI 验收参考。

---

## Dependencies / Assumptions

- 依赖 Creator MVP 已部署可访问（`make creator-dev` 或 `https://localhost/creator/`）。
- 假设 DM Sans 可通过现有前端栈引入（Google Fonts 或本地），与原型一致。
- 假设现有 `StepProgress`、各 Page 组件为改造入口，无需重写路由或 auth。
- 假设 polish 期间原型文件不再大幅变更；若设计更新，以 README 生成日期后的人工同步为准。

---

## Outstanding Questions

### Resolve Before Planning

（无）

### Deferred to Planning

- [Affects R2][Technical] 共享组件目录结构（`creator/src/components/` 下新增哪些 primitive）与 CSS Modules 命名约定。
- [Affects R4][Technical] 「忘记密码」采用禁用链接还是完全省略 — 建议 planning 阶段按无后端默认省略。
- [Affects R16][Technical] 项目卡片占位视觉：按流水线类型的 SVG/渐变方案具体选型。
- [Affects R14][Technical] 移动端顶栏折叠 vs 汉堡菜单的具体交互选型。
- [Affects 整体验收][Needs research] 是否引入视觉回归截图对比（如 Playwright screenshot）作为 CI 可选门禁 — 验证期前非必须。
