# 稿面锁定文案按原因分支

Written against: `cef08c260a4ab8a63f6f74b8908316eb4693645f`

## Evidence chain

- Surface: `/creator/projects/:id` 向导 · `StepEditorPanel` 稿面锁定态（`editorDisabled`）
- Problem: `aiPending` 与选区改写锁定共用同一句「预览确认中，稿面已锁定」，AI 生成时状态文案错误
- Design evidence: 同任务内用户可见状态文案须对应当前锁定原因；`SelectionRewriteFloat` 预览确认与 `AiSuggestionPanel` 生成 loading 是两条不同路径
- Owner: `creator/src/components/StepEditorPanel.tsx`；编排：`creator/src/pages/project-detail/ProjectWizardView.tsx`
- Scope and affected surfaces: 项目向导步骤编辑区锁定提示；`StepEditorPanel.test.tsx`
- Uncertainty: none

## Design decision

为稿面锁定引入明确原因，并渲染对应文案：AI 生成中与选区改写预览确认不得共用同一句提示。不改变锁定行为本身，只修正界面文案与可测契约。

## Reuse

- 现有 `.lockNote` / `.editorLocked` 样式（`StepEditorPanel.module.css`）保持不变
- 锁定触发逻辑仍由 `ProjectWizardView` 的 `aiPending || selectionRewrite?.locked` 编排
- Exemplar: 无新视觉 primitive；文案模式对齐面板内既有状态短语（如「改写中…」「正在结合品牌档案生成…」）

## Changes

1. `creator/src/components/StepEditorPanel.tsx`
   - Change: 新增可选 prop，例如 `lockReason?: 'ai-generating' | 'rewrite-preview'`（名称可等价）。当 `editorDisabled` 为真时：
     - `'ai-generating'` → 显示「AI 生成中，稿面已锁定」
     - `'rewrite-preview'`（或未传且仅改写场景）→ 显示「预览确认中，稿面已锁定」
     - 若两者同时可能：优先显示改写预览文案，或由调用方只传入当前主导原因（见下条）
   - Preserve: `editorDisabled` 仍控制 textarea/按钮禁用与 `.editorLocked` 样式；无锁定时仍显示「划选文字可改这段」
   - Verify: 单元测试覆盖两种文案；旧测试「锁定稿面时提示预览确认中」改为显式传入 `rewrite-preview`

2. `creator/src/pages/project-detail/ProjectWizardView.tsx`
   - Change: 向 `StepEditorPanel` 传入 `lockReason`：`selectionRewrite?.locked` → `'rewrite-preview'`；否则若 `aiPending` → `'ai-generating'`；未锁定可不传
   - Preserve: `editorDisabled={aiPending || !!selectionRewrite?.locked}` 与选区 float 行为不变
   - Verify: 点「换一版」待生成时稿面显示「AI 生成中…」；选区改写预览确认时显示「预览确认中…」

3. `creator/src/components/StepEditorPanel.test.tsx`
   - Change: 为两种 `lockReason` 各加一条断言；更新现有锁定测试以传入 `rewrite-preview`
   - Preserve: 选区上报、素材库入口等既有用例
   - Verify: `cd creator && npm test -- --run src/components/StepEditorPanel.test.tsx`

## Scope

- Inherit: 所有经 `ProjectWizardView` 渲染的 AI 启用步骤编辑区
- Verify: 无 AI 步骤（仅 `editorPanel`、无 `selectionRewrite`）不受影响
- Exclude: 不改 `useSelectionRewrite` 锁定语义；不改 AI 面板 loading UI；不做无障碍专项扩展

## Validation

- Product: 生成建议与选区改写预览时，稿面锁定提示分别正确
- Interface: 桌面/窄屏向导；`aiPending`  alone；`rewrite locked` alone；两者重叠时只显示调用方传入的单一原因
- System: 仍复用 `.lockNote`，不新增平行锁定样式
- Repository: `cd creator && npm test -- --run src/components/StepEditorPanel.test.tsx` → 通过

## Stop conditions

- Stop if 产品决定 AI 生成期间不再禁用稿面（则本计划作废，需另开行为变更）
- Stop if `lockReason` 需扩展到第三种锁定源且文案未定

## Design documentation

- After acceptance and validation: 无需改 `FRONTEND.md`；可选在 `StepEditorPanel` 行备注「锁定文案按 lockReason」——非必须
