---
title: "创作者工作台图标体系：舞台流水线 SVG 与三层图标规范"
date: 2026-06-25
category: design-patterns
module: creator
problem_type: design_pattern
component: development_workflow
severity: low
applies_when:
  - "creator/ 侧栏或认证页仍使用 Unicode 字符占位图标"
  - "需要 favicon / Apple Touch Icon 与 Stage Line 签名元素一致的 Mark"
  - "流水线 StepProgress 需要按 step_key 显示语义图标而非纯数字"
resolution_type: code_fix
tags:
  - creator
  - icons
  - svg
  - design-tokens
  - stage-line
  - step-progress
  - favicon
related_components:
  - admin
last_refreshed: 2026-07-15
---

# 创作者工作台图标体系：舞台流水线 SVG 与三层图标规范

## Context

2026-06-25 侧栏重设计后，creator 仍用 Unicode（`✦ ◈ ◇ ○`）充当品牌与导航图标；无 favicon，登录/找回密码页无统一 Mark，向导步进条仅显示数字。产品选定 **方向 A（舞台流水线）**：三阶段竖条 + 横贯舞台光 + 薄荷 AI 光心，与 `--stage-line` 签名元素一致。

约束不变：禁止 Tailwind/UI 库；颜色走 `var(--*)` token；图标与现有 `IconInput` stroke 规范对齐。

## Guidance

### 1. 三层图标架构

| 层级 | 文件 | 用途 |
|------|------|------|
| 品牌层 | `icons/CreatorMark.tsx`、`components/AuthBrandMark.tsx`、`public/favicon.svg`、`public/apple-touch-icon.png` | 侧栏 Mark、认证页、favicon |
| 导航层 | `icons/NavIcons.tsx` | 侧栏四项主导航；灵感实验室激活态用 `navActiveAi`（`--ai`） |
| 步骤层 | `icons/StepIcons.tsx` | `StepProgress` 按 `step_key` 渲染；完成态用 `CheckIcon` |

目录：`creator/src/components/icons/`。账号入口不在侧栏主导航，而在顶栏 / 移动端 `UserMenu`（见 [侧栏布局文档](./creator-workspace-ui-redesign-studio-sidebar.md)）。

### 2. 品牌 Mark（Direction A）

`CreatorMark`（viewBox 24×24）：

- 三条高度不一的竖条 → 流水线阶段
- `y=12` 横线 → 舞台光
- 中心圆 `fill="var(--ai)"` → AI 光心
- 置于 `.mark` 珊瑚渐变底上，`color: var(--on-accent)`

`favicon.svg` 为静态简化版（hex 仅出现在 `public/`，符合 token 约定）。

### 3. 导航与双色 accent

侧栏主导航（`CreatorLayout` `NAV`）：

- 项目 / 图片素材库 / 品牌档案：激活态 `--accent`（珊瑚）；素材库用 `AssetsIcon`
- 灵感实验室：激活态 `--ai`（薄荷），与 Playground 空态、AI 面板视觉链路一致
- 账号：`UserMenu` 菜单项（`AccountIcon`），不是侧栏第四项

图标规范：24×24 viewBox、1.5px stroke、`currentColor`、与 `MailIcon`/`LockIcon` 一致。

### 4. 步骤图标与后端对齐

`StepIcons.tsx` 必须覆盖 `app/creator/pipelines.py` 中全部 12 个 `step_key`（短视频 + 长图文）。验收：

```bash
python -c "
from app.creator.pipelines import SHORT_VIDEO_STEPS, LONG_ARTICLE_STEPS
keys = {s.key for s in SHORT_VIDEO_STEPS} | {s.key for s in LONG_ARTICLE_STEPS}
icons = {'topic','hook','script','storyboard','cover_title','production_notes','publish','outline','body','title_summary','visuals','seo_variants'}
assert keys == icons
"
```

`StepProgress` 行为：

- **已完成**：绿色圆环 + `CheckIcon`；可点击回退（publish 除外）
- **进行中 / 待完成**：`StepIcon` + 步骤语义图形

登录页 hero 流水线示意复用 `StepIcon`（topic / script / publish）。

### 5. 认证页品牌

`AuthBrandMark`：

- 桌面登录：hero 区完整品牌（Mark + 文案）
- 移动登录 / 找回 / 重置：卡片顶 `compact` Mark
- CSS：`.heroBrand`（≥861px）；`.cardBrand`（≤860px）

### 6. HTML 静态资源

`creator/index.html`：

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

构建：`cd creator && npm run build`（`tsc -b && vite build`）。

## Why This Matters

Unicode 占位符在小尺寸模糊、无法继承 token、无语义。统一 SVG 体系让 Stage Line 在 favicon 可识别，珊瑚/薄荷分工从 Mark 贯穿导航、Playground 空态到 AI 面板，与侧栏重设计的 token 叙事一致。

## When to Apply

- 新增 pipeline `step_key` → 先在 `STEP_ICONS` 增加图标再发 UI
- 新增侧栏项 → 扩展 `NavIcons.tsx`，18px stroke
- 新认证/空态 surface → 复用 `AuthBrandMark` / 对应 Nav 或 Step 图标，禁止退回 Unicode
- 更新 touch icon → 压缩 PNG（目标 <100KB）；优先 SVG 导出而非 AI 大图

## Examples

**导航（前 → 后）：**

```tsx
// Before
{ to: '/playground', label: '灵感实验室', icon: '✦' }

// After — 侧栏主导航示例
{ to: '/', label: '项目', Icon: ProjectsIcon },
{ to: '/assets', label: '图片素材库', Icon: AssetsIcon },
{ to: '/playground', label: '灵感实验室', Icon: PlaygroundIcon, accent: 'ai' },
{ to: '/brand', label: '品牌档案', Icon: BrandIcon },
```

**步进圆点：**

```tsx
{done ? <CheckIcon size={14} /> : <StepIcon stepKey={step.key} size={14} />}
```

**浏览器目视验收（session history）：**

- `make creator-dev` → `http://localhost:5174/creator/login`（桌面 hero + 移动 cardBrand）
- 项目详情页 StepProgress：已完成勾、进行中珊瑚高亮、待完成 muted 图标
- Playground 侧栏激活态薄荷色

## Related

- [创作者工作台 UI 重设计：工作室侧栏与设计 token 体系](./creator-workspace-ui-redesign-studio-sidebar.md) — 布局与 token 前置；本文补全图标层
- [创作者工作台前端规范](../../../creator/FRONTEND.md)
- [CONCEPTS.md](../../../CONCEPTS.md) — Stage Line、Studio Sidebar

## Known follow-ups

- `apple-touch-icon.png` 约 1.3MB（AI 生成）— 上线前需压缩或改用 SVG→PNG 脚本
- `creator/FRONTEND.md` 尚未列出 `icons/` 与 `AuthBrandMark` — 可选文档同步
