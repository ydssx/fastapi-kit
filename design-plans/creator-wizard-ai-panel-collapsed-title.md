# 移动端 AI 面板折叠标题统一为「AI 建议」

Written against: `cef08c260a4ab8a63f6f74b8908316eb4693645f`

## Evidence chain

- Surface: `/creator/projects/:id` 向导 · 窄屏（`<900px`）`StepWorkspace` 折叠态 `AiSuggestionPanel`
- Problem: 折叠标题为「要 AI 建议」，与面板正式名「AI 建议」不一致
- Design evidence: 同组件 `aria-label="AI 建议"`；展开标题 `AI 建议 · ${stepTitle}`；`creator/FRONTEND.md` 与 `creator/docs/prototypes/v2/README.md` 均称「AI 建议」
- Owner: `creator/src/components/AiSuggestionPanel.tsx`
- Scope and affected surfaces: 窄屏折叠标题一行；`collapsedHint` 可保留
- Uncertainty: none

## Design decision

折叠态标题改为「AI 建议」，与 `aria-label` 及展开态产品名对齐。引导语继续由既有 `collapsedHint`（「展开后可生成、对比并采用草稿」）承担，不另发明标题文案。

## Reuse

- 既有 `.title`、`.collapsedHint`、`.toggle` / `.toggleMint` 结构不变
- Exemplar: 展开态标题前缀「AI 建议」；组件 `aria-label`

## Changes

1. `creator/src/components/AiSuggestionPanel.tsx`
   - Change: 将 `mobileCollapsed ? '要 AI 建议' : …` 改为 `mobileCollapsed ? 'AI 建议' : …`
   - Preserve: 展开标题 `AI 建议 · ${stepTitle}`；`collapsedHint`；展开/收起按钮文案与行为
   - Verify: 窄屏折叠时标题为「AI 建议」；展开后仍带步骤名

## Scope

- Inherit: 经 `StepWorkspace` 注入 `mobileCollapsed` 的向导 AI 面板
- Verify: 桌面宽屏（无折叠）不受影响
- Exclude: 不改 toggle 颜色；不做文案 A/B；不改 `collapsedHint`

## Validation

- Product: 窄屏用户折叠 AI 面板时看到与产品一致的面板名
- Interface: `<900px` 折叠与展开；有/无 `stepTitle`
- System: 无新组件
- Repository: 若有覆盖该文案的测试则更新并 `cd creator && npm test -- --run src/components/AiSuggestionPanel.test.tsx`；否则 `npm run build` 即可

## Stop conditions

- Stop if 产品书面确认「要 AI 建议」为有意 CTA 折叠标题（则关闭本计划并记录为例外）

## Design documentation

- After acceptance and validation: none
