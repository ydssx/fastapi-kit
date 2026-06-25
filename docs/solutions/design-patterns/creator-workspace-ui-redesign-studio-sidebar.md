---
title: "创作者工作台 UI 重设计：工作室侧栏与设计 token 体系"
date: 2026-06-25
category: design-patterns
module: creator
problem_type: design_pattern
component: development_workflow
severity: low
applies_when:
  - "需要重塑 creator/ 工作台视觉与信息架构，而非修单个组件样式"
  - "从顶栏导航迁移到侧栏工作室布局"
  - "在禁止 Tailwind/UI 库、仅 CSS Modules 的约束下做系统性 UI 升级"
resolution_type: code_fix
tags:
  - creator
  - ui-redesign
  - css-modules
  - design-tokens
  - sidebar-layout
  - vite
related_components:
  - admin
last_refreshed: 2026-06-25
---

# 创作者工作台 UI 重设计：工作室侧栏与设计 token 体系

## Context

创作者工作台（`creator/`）原有 UI 为暗色顶栏导航 + 琥珀强调色（Instrument Serif / DM Sans），信息架构偏「通用 SaaS」，与「内容流水线工作室」的产品定位不够贴合。产品方要求重设计整体 UI，并在第二轮继续打磨登录、灵感实验室、品牌档案、账号与项目向导等页面。

约束来自 `creator/FRONTEND.md`：禁止 Tailwind 与 UI 库；样式用 CSS Modules；颜色必须通过 `var(--*)` token；业务 API 与 `apiFetch` 信封不变。

## Guidance

### 1. 设计方向与 token（`creator/src/index.css`、`creator/index.html`）

确立 **「工作室侧栏」** 视觉语言：

| Token | 用途 | 值 |
|-------|------|-----|
| `--accent` | 主操作、导航激活 | `#ff6e40`（珊瑚） |
| `--ai` | AI 面板、灵感实验室 | `#5eead4`（薄荷） |
| `--success` | 完成态 | `#6ee7a8` |
| `--stage-line` | 面板顶部签名光带 | 珊瑚渐变 |
| `--sidebar-width` | 桌面侧栏宽度 | `248px` |
| `--layout-sticky-top` | 移动端 sticky 偏移 | 顶栏高度（如 `56px`） |

字体：Fraunces（`--font-display`）、Outfit（`--font`）、JetBrains Mono（`--font-mono`，标签/用量/进度）。

在 `index.html` 引入 Google Fonts；全局背景用多层 radial-gradient + 低透明度噪点纹理。

### 2. 布局：顶栏 → 侧栏（`creator/src/layouts/CreatorLayout.*`）

- **桌面（≥900px）**：固定左侧 `aside`（品牌、导航、QuotaDisplay、账号/退出）；主内容 `margin-left: var(--sidebar-width)`，最大宽度约 1040px。
- **移动（<900px）**：隐藏侧栏；sticky 顶栏 + 汉堡菜单展开导航面板。
- 在 `.shell` 上设置 `--layout-sticky-top`，供 `ProjectDetailPage` 的 `.stickyWizardHead` 使用 `top: var(--layout-sticky-top)`。

导航项带 SVG 图标与 `aria-current="page"`；激活态左侧珊瑚色条 + `--accent-muted` 背景。灵感实验室激活态单独使用 `--ai`（见 [图标体系](./creator-workbench-icon-system-stage-pipeline.md)）。

### 3. 共享样式层（`creator/src/styles/shared.module.css`）

- `.page`：纵向间距 + `stageReveal` 入场动画（尊重 `prefers-reduced-motion`）。
- `.pageHeader`：底部分割线 + `--stage-line` 短强调线。
- `.panel`：顶缘舞台光；表单、按钮、徽章统一新 token。
- `.btnPrimary`：珊瑚渐变 + 阴影；徽章用 `--font-mono`。

页面级 CSS 通过 `composes: page from '../styles/shared.module.css'` 复用，避免重复。

### 4. 按页面打磨要点

| 区域 | 文件 | 要点 |
|------|------|------|
| 项目首页 | `ProjectsPage.*`、`ProjectCard.*` | Hero 新建区；卡片左侧 hover 色条 + 进度条替代圆点 |
| 登录/认证 | `LoginPage.*`、Forgot/Reset | 左侧流水线步骤示意；登录/注册分段 Tab；卡片顶线 |
| 灵感实验室 | `PlaygroundPage.*`、TopicCards、RefinePanel | 薄荷空态；选题卡片左色条选中；对话气泡区分用户/助手 |
| 品牌档案 | `BrandPage.*` | 桌面双栏：表单 + sticky 预览（AI 色系） |
| 账号 | `AccountPage.*` | 账号信息卡与改密卡分离 |
| 项目向导 | `StepProgress.*`、`StepWorkspace.*`、`ProjectDetailPage.*` | 步骤间连接线；编辑区与 AI 面板竖线分隔 |

### 5. 文档与验收

更新 `creator/FRONTEND.md` 的「视觉定位」节，与 token 保持一致。构建验收：

```bash
cd creator && npm run build
# 或 make creator-dev → http://localhost:5174/creator/
```

对照 `creator/docs/prototypes/v2/` 原型图做视觉回归。v2 截图为 2026-06-11 **顶栏**版（琥珀主题）；侧栏重设计后以 `creator/FRONTEND.md` 与本文 token 为准，需运行 `scripts/capture_creator_v2_prototypes.py` 更新截图后再做像素级对照。

### 6. 禁止事项（保持既有约定）

- 不引入 Tailwind / shadcn / MUI 等。
- 不在页面内裸 `fetch`。
- 不硬编码色值（`#ff6e40` 等只出现在 `:root` token 定义处）。

## Why This Matters

- **信息架构**：侧栏把「项目 / 实验室 / 品牌 / 账号」固定为工作室导航，主内容区专注创作，符合流水线心智。
- **语义色分离**：珊瑚=用户操作，薄荷=AI/实验，降低 AI 面板与主 UI 混淆。
- **可维护性**：token 集中在一处，组件只引用 `var(--*)`，后续换肤或对齐 admin 时改动面可控。
- **可访问性**：保留 `focus-visible`、ARIA（导航 `aria-current`、菜单 `aria-expanded`）、`prefers-reduced-motion`。

若不建立 token/布局约定，逐页改色会导致 admin/creator 分叉、sticky 头部在移动端被顶栏遮挡、以及 AI 区与编辑区视觉权重失衡。

## When to Apply

- 新增加创作者页面或大幅改版时，先读 `creator/FRONTEND.md` 与 `index.css` token，再写 CSS Module。
- 需要 sticky 子头部时，使用 `--layout-sticky-top` 而非 magic number。
- AI 相关表面（建议面板、实验室、品牌预览）优先用 `--ai` / `--ai-muted` / `--ai-panel`。
- 面板级容器复用 `shared.panel` 或复制其 `::before` 舞台光模式，保持签名一致。

## Examples

### 布局：侧栏 shell

```tsx
// CreatorLayout.tsx — 桌面侧栏 + 移动顶栏
<div className={styles.shell}>
  <aside className={styles.sidebar}>…nav + QuotaDisplay + user…</aside>
  <div className={styles.content}>
    <header className={styles.mobileHeader}>…</header>
    <main className={styles.main}><Outlet /></main>
  </div>
</div>
```

### Sticky 向导头

```css
/* ProjectDetailPage.module.css */
.stickyWizardHead {
  position: sticky;
  top: var(--layout-sticky-top, 0px);
}
```

### 前后对比（摘要）

| 维度 | 改前 | 改后 |
|------|------|------|
| 导航 | 顶栏 pill 导航 | 左侧固定侧栏（移动折叠） |
| 强调色 | 琥珀 `#f2b84b` | 珊瑚 `#ff6e40` + 薄荷 AI 色 |
| 字体 | Instrument Serif + DM Sans | Fraunces + Outfit + JetBrains Mono |
| 项目进度 | 圆点 | 进度条 + 等宽百分比 |
| 登录 | 文字切换登录/注册 | 分段 Tab + 流水线示意 |

## Related

- [创作者工作台图标体系：舞台流水线 SVG](./creator-workbench-icon-system-stage-pipeline.md) — Unicode 占位 → SVG 三层图标
- [创作者工作台前端规范](../../../creator/FRONTEND.md)
- [Creator v2 原型索引](../../../creator/docs/prototypes/v2/README.md) — 当前截图为重设计前顶栏版
- [Admin/Creator Caddy 尾斜杠重定向](../integration-issues/admin-caddy-path-without-trailing-slash-2026-05-18.md) — 部署路径 `https://localhost/creator/`
- [Admin modal 定位问题](../ui-bugs/admin-modal-offscreen-transform-containing-block-2026-05-19.md) — admin 侧 UI 排错参考，creator 未复现同类问题但 sticky/transform 意识可借鉴

### Session history（本轮对话）

- **尝试过**：第一轮全站 token + 侧栏 + 核心组件；用户要求「继续打磨」后第二轮覆盖认证、实验室、品牌、账号、向导。
- **未采用**：引入 Tailwind 或第三方组件库（违反 FRONTEND 禁止项）；保留顶栏导航（不符合工作室定位）。
- **关键决策**：珊瑚/薄荷双色分工；`--stage-line` 作为轻量签名而非重动画；移动端用 CSS 变量统一 sticky 偏移。
