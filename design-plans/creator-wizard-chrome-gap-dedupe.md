# 向导 chrome 去叠乘：去掉 page 子级多余 bottom margin

Written against: `0939c8bf1c63fc778932ebd01567e21ca2cc1778`

## Evidence chain

- Surface: `/creator/projects/:id` 向导 · `platformFold` 与 `stickyWizardHead` 与 `shared.page` 子级间距
- Problem: 组件自带 `margin-bottom` 叠在 `shared.page` 的 `gap: var(--space-xl)` 上，chrome 缝被放大（测得 platform→sticky≈48px、sticky→workspace≈40px）
- Design evidence: 侧栏重设计规定 `.page` 负责子级纵向间距；v2 compact /「主画布专注创作」要求向导 chrome 紧凑；视觉巡检 1280×900 工作区约在视口 60% 高度才开始
- Owner: `creator/src/pages/ProjectDetailPage.module.css`
- Scope and affected surfaces: 向导（及任何复用这两类名的项目详情变体）垂直节奏
- Uncertainty: none

## Design decision

间距只由页面级 `gap` 承担：去掉 `.platformFold` 与 `.stickyWizardHead` 的 bottom margin，消除与 `shared.page` gap 的叠乘。不在本计划改 gap token 数值（仍用 `--space-xl`），也不合并头带（见 `creator-wizard-merge-header-band.md`）。

## Reuse

- 既有 `shared.page` 的 `gap: var(--space-xl)` 作为唯一子级间距来源
- 既有 `--space-*` token；不新增间距 primitive
- Exemplar: 重设计文档中 sticky 示例仅设 `top: var(--layout-sticky-top)`，不以额外 margin 对抗 page gap

## Changes

1. `creator/src/pages/ProjectDetailPage.module.css`
   - Change:
     - `.platformFold`：将 `margin: 0 0 var(--space-md);` 改为 `margin: 0;`（或删除 margin 声明）
     - `.stickyWizardHead`：删除 `margin-bottom: var(--space-sm);`
   - Preserve: `platformFold` 边框/背景；`stickyWizardHead` 的 `padding`、`sticky`、`top`、`backdrop-filter`、底部分割线与 `::after` stage 短线
   - Verify: 在向导页量相邻块间距应接近单一 page gap（约 32px），不再出现 40/48 的叠乘缝

## Scope

- Inherit: `ProjectWizardView` 中带 `platformFold`（前两步）与 `stickyWizardHead`（非发布步）的布局
- Verify: 发布步仅渲染非 sticky 的 `StepProgress`（无 `stickyWizardHead`）不受 margin 删除影响；完成态无这两类名
- Exclude: 不改 `shared.page` 全局 gap；不合并 toolbar/hero；不改平台文案重复（见 `creator-wizard-hero-platform-once.md`）

## Validation

- Product: 打开进行中项目（步骤 1）→ 平台折叠、步骤条、双栏工作区之间缝隙均匀、无「双份空白」
- Interface: 有/无 `platformFold`（步骤 1 vs 步骤 ≥3）；sticky 滚动时头仍贴 `var(--layout-sticky-top)`；1280 与 390 宽
- System: 无新间距 utility；组件不再与 page gap 双重负责
- Repository: `cd creator && npm run lint` → pass（纯 CSS；若有视觉回归测试则跑相关用例）

## Stop conditions

- Stop if 去掉 margin 后某块与相邻块视觉贴死（例如 sticky 底边与 workspace 顶边撞线），且需改的是 `padding` 而非恢复 margin——则只微调该组件 `padding`，仍不要加回 sibling margin
- Stop if 发现 `.platformFold` / `.stickyWizardHead` 在非 `shared.page` 父级复用并依赖 bottom margin（当前仓库无此用法；若有则先拆 modifier）

## Design documentation

- After acceptance and validation: none（节奏规则已在侧栏重设计 solution 的 `.page` 纵向间距中；可选在该文「Sticky 向导头」示例下补一句「勿再给 sticky 子头加 margin-bottom」）
