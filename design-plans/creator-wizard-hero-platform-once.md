# 前两步平台文案只出现在 platformFold

Written against: `0939c8bf1c63fc778932ebd01567e21ca2cc1778`

## Evidence chain

- Surface: `/creator/projects/:id` 向导 · `stepIndex <= 1` 且 `canEditPlatforms`
- Problem: hero meta 已显示「短视频 · 小红书」，下方 `platformFold` 摘要再次显示「目标平台 小红书 · 主平台 小红书」，同一任务相邻 chrome 重复平台身份
- Design evidence: P3 头区平台只出现一次；v2 README 仅规定「目标平台选择仅在前两步显示」，未要求 hero 再镜像一份；视觉巡检首屏同时可见两行平台文案
- Owner: `creator/src/pages/project-detail/ProjectWizardView.tsx`
- Scope and affected surfaces: 前两步可编辑平台时的 `heroCompact` meta 行
- Uncertainty: none

## Design decision

当 `showPlatformPicker` 为真时，hero meta 只保留流水线名；平台与主平台文案及编辑入口只留在 `platformFold`。步骤 ≥2（或不可改平台）时，hero meta 仍显示 `pipeline · platforms`，与现行为一致。

## Reuse

- 既有 `showPlatformPicker`（`canEditPlatforms && stepIndex <= 1`）
- 既有 `pipelineLabel` / `platformLabels`；不改 `PlatformPicker` API
- Exemplar: 发布步/中后段步骤「身份在 hero、无折叠条」的单一展示；前两步改为「身份在 fold」

## Changes

1. `creator/src/pages/project-detail/ProjectWizardView.tsx`
   - Change: 在 `heroCompact` 的 `.meta` 中，仅当 `!showPlatformPicker` 且 `project.target_platforms.length > 0` 时渲染 `·` + `platformLabels(project.target_platforms)`。当 `showPlatformPicker` 时 meta 只输出 `pipelineLabel(project.pipeline_id)`。
   - Preserve: `platformFold` 摘要仍用 `editPlatforms` / `editPrimaryPlatform`（及 project fallback）；`PlatformPicker` 保存/确认逻辑不变；`sourceParts` / AI 脚注中的平台信息不在本计划改动范围（可继续用项目主平台）
   - Verify: 步骤 1–2 hero 无「小红书」类平台文案，fold 摘要仍有；进入步骤 3 后 hero 重新出现 `流水线 · 平台`

2. 测试（推荐）
   - Change: 若易测，在 `ProjectDetailPage.test.tsx` 或向导相关测试中断言：前两步可编辑时，页面上平台编辑入口仍在，且 hero 区域不重复展示与 fold 相同的平台列表文案（也可用 role/label 查询 fold）
   - Preserve: 改平台确认对话框、主平台校验等既有用例
   - Verify: `cd creator && npm test -- --run src/pages/ProjectDetailPage.test.tsx`

## Scope

- Inherit: 所有 `showPlatformPicker === true` 的向导步
- Verify: `showPlatformPicker === false` 时 hero 仍显示平台；发布核对、完成态无此 fold
- Exclude: 不删除或改样式 `platformFold`；不合并头带；不去 margin 叠乘（分属另外两份计划）；不改平台保存 API

## Validation

- Product: 步骤 1 打开项目 → hero 仅流水线名；「目标平台」折叠条仍显示平台与主平台并可编辑；推进到不可改平台的步骤后 hero 恢复 `流水线 · 平台`
- Interface: 多平台 + 主平台、单平台、清空平台被拒等既有路径；窄屏 fold 摘要不截断到不可读
- System: 无新平台展示组件；条件分支只挂在已有 `showPlatformPicker`
- Repository: `cd creator && npm test -- --run src/pages/ProjectDetailPage.test.tsx` → pass；`cd creator && npm run lint` → pass

## Stop conditions

- Stop if 产品要求前两步 hero 必须始终显示平台（则本 finding 作废，改文档而非改 UI）
- Stop if 隐藏 hero 平台后，无障碍或测试依赖「页面上两处平台文案」且无法用 fold 替代断言

## Design documentation

- After acceptance and validation: 在 `creator/docs/prototypes/v2/README.md`「布局说明」补一句：前两步平台只在折叠条展示，hero meta 不重复；或写入 `creator/FRONTEND.md` 向导要点一行
