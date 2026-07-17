# AI 快捷调整 chip 改用薄荷色系

Written against: `cef08c260a4ab8a63f6f74b8908316eb4693645f`

## Evidence chain

- Surface: `/creator/projects/:id` 向导 · `AiSuggestionPanel` 底部快捷调整 chip
- Problem: `.adjustChip` 使用珊瑚 `--accent`，与同屏选区改写 chip 的薄荷 `--ai` 及「珊瑚=用户操作 / 薄荷=AI」分工冲突
- Design evidence: `docs/solutions/design-patterns/creator-workspace-ui-redesign-studio-sidebar.md`（语义色分离；AI 表面优先 `--ai`）；`creator/FRONTEND.md`（薄荷 AI 色）；同任务 exemplar `SelectionRewriteFloat.module.css` `.chip`
- Owner: `creator/src/components/AiSuggestionPanel.module.css`
- Scope and affected surfaces: AI 建议面板快捷调整行；不影响「采纳全部」等用户主操作按钮
- Uncertainty: none

## Design decision

将 AI 面板内快捷调整 chip 的边框/悬停背景从 `--accent` 族改为 `--ai` 族，与同任务选区改写 chip 对齐，恢复珊瑚/薄荷语义分离。不改变 chip 文案、布局或点击行为。

## Reuse

- Token: `--ai`、`--ai-muted`、`--border`、`--surface`、`--text`（均已在 `creator/src/index.css`）
- Exemplar: `creator/src/components/SelectionRewriteFloat.module.css` 中 `.chip` / `.chip:hover:not(:disabled)`（含 focus-visible 的 AI 描边可选对齐）

若现有系统无法表达：不需要新 primitive；仅修正 `.adjustChip` 对错误 token 的引用。

## Changes

1. `creator/src/components/AiSuggestionPanel.module.css`
   - Change: 更新 `.adjustChip` 与 `.adjustChip:hover:not(:disabled)`：
     - 默认边框：`color-mix(in srgb, var(--ai) 28%, var(--border))`（或与 exemplar 等价）
     - 悬停：`border-color: var(--ai)`；背景 `color-mix(in srgb, var(--ai) 12%, var(--surface))` 或 `var(--ai-muted)` 系
     - 可选：为 focus-visible 增加与 exemplar 一致的 `box-shadow: 0 0 0 3px color-mix(in srgb, var(--ai) 18%, transparent)`
   - Preserve: padding、圆角 pill、字号、disabled 透明度、`adjustments` 布局；`shared.btnPrimary` / `shared.btn` 采纳与插入按钮仍用珊瑚主操作样式
   - Verify: AI 面板快捷调整 chip 视觉为薄荷；主操作按钮仍为珊瑚

## Scope

- Inherit: 所有渲染 `adjustments` 的 AI 启用步骤
- Verify: `toggle` / `toggleMint`、variant tab 等其余 AI 面板 chrome 已用 `--ai` 者无需改动
- Exclude: 不改 `stepAiAdjustments.ts` 文案；不改 `SelectionRewriteFloat`；不把「采纳全部」改成薄荷主按钮

## Validation

- Product: 创作者在 AI 面板点快捷调整时，chip 色系与选区「改这段」chip 一致，仍能触发调整
- Interface: 桌面双栏与窄屏折叠展开后的 AI 面板；有/无 adjustments；disabled（loading）态
- System: 无新平行 chip 组件；仅 token 对齐 exemplar
- Repository: `cd creator && npm run build` → 成功（纯 CSS；可选跑 `AiSuggestionPanel` 相关 test 若存在）

## Stop conditions

- Stop if 产品明确把「快捷调整」定义为用户主操作并应继续使用珊瑚（需书面推翻语义色分离）
- Stop if 改色范围被要求波及采纳/插入按钮

## Design documentation

- After acceptance and validation: none（既有文档已规定语义色；本变更是对齐实现）
