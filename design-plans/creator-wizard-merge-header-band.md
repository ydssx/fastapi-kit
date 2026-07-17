# 向导头带合并：返回与更多并入 compact hero

Written against: `0939c8bf1c63fc778932ebd01567e21ca2cc1778`

## Evidence chain

- Surface: `/creator/projects/:id` 进行中向导 · `ProjectWizardView` 页头
- Problem: 「← 返回列表」与「更多」独占一行，再与 `heroCompact`（标题 / 元信息 / 步骤徽章）隔开，首屏创作区被额外顶下一截
- Design evidence: P3 桌面规格为单行头（返回 + 标题/元信息 + 步骤 N/7）；视觉巡检 1280×900 下独立 `toolbar`≈36px + `shared.page` gap 32px，工作区约从 y=544 才开始
- Owner: `creator/src/pages/project-detail/ProjectWizardView.tsx`；样式：`creator/src/pages/ProjectDetailPage.module.css`
- Scope and affected surfaces: 进行中向导页头；完成态仍用独立 `toolbar`（见 Exclude）
- Uncertainty: 窄屏上返回链接、标题与「更多」同一行时的换行/对齐需在 390 宽目视确认

## Design decision

将向导进行中态的返回链接与更多菜单并入 `heroCompact` 同一条头带，去掉独立 `toolbar` 行，对齐 P3 单行头并回收首屏垂直空间。不改变返回目标、删除菜单行为或标题编辑语义。

## Reuse

- 既有 `shared.backLink`、`styles.moreMenu` / `moreTrigger` / `morePopover`（由 `ProjectDetailPage` 传入的 `moreMenu`）
- 既有 `heroCompact` / `heroCompactMain` / `stepBadge` / `titleInputCompact`
- Exemplar: P3 单行头结构；侧栏重设计后的 compact hero 视觉 token 不变

## Changes

1. `creator/src/pages/project-detail/ProjectWizardView.tsx`
   - Change: 删除独立 `<div className={styles.toolbar}>…</div>`。在 `<header className={styles.heroCompact}>` 内重组为：顶行或同带内左侧 `Link`（`shared.backLink`）+ 右侧 `moreMenu`；其下或同行保留 `heroCompactMain`（meta + 标题）与 `stepBadge`。推荐结构：`heroCompact` 为纵向两段——第一段 `heroChrome`（返回 | 更多），第二段 `heroCompactMain` + `stepBadge`（与现视觉层级一致，但仍比独立 toolbar + gap 少一整段 page gap）。若实现为一整行（返回 · meta/标题 · badge · 更多），须保证标题输入仍可聚焦且 `stepBadge` 不换行挤掉标题。
   - Preserve: 返回仍指向 `/`；`moreMenu` 仍为传入的同一节点；`draftWarning` 仍在头带之上或紧随其后；标题 `onBlur` 保存不变
   - Verify: 进行中向导不再出现单独的 toolbar 行；返回与更多仍可用

2. `creator/src/pages/ProjectDetailPage.module.css`
   - Change: 为合并后的头带增加必要布局类（如 `.heroChrome`：`display:flex; justify-content:space-between; align-items:center; gap: var(--space-sm); width:100%`）。调整 `.heroCompact` 为 `flex-wrap`/`flex-direction` 以容纳 chrome 行，避免与 `stepBadge` 抢位。可保留 `.toolbar` 规则供完成态使用，或抽取共享的 chrome 行样式供两处复用——优先最小改动：完成态继续用 `.toolbar`，向导用 `.heroChrome`
   - Preserve: `titleInputCompact`、`stepBadge`、珊瑚 token；`morePopover` 绝对定位仍相对 `moreMenu`
   - Verify: 1280 与 ≤900 宽下头带不横向溢出；更多菜单弹出不被裁切（`overflow` 勿裁剪 popover）

3. 测试（若有页头断言）
   - Change: 若 `ProjectDetailPage.test.tsx` 依赖「返回列表」与标题的 DOM 邻近关系，更新查询方式；无则可不改
   - Preserve: 删除项目、标题保存等行为用例
   - Verify: `cd creator && npm test -- --run src/pages/ProjectDetailPage.test.tsx`

## Scope

- Inherit: 所有经 `ProjectWizardView` 渲染的进行中项目
- Verify: `ProjectCompletedView` 仍使用独立 `toolbar`，不受本次结构影响
- Exclude: 不改完成态页头；不改 `StepProgress` / `ContextChips` / 双栏工作区；不改侧栏或顶栏配额

## Validation

- Product: 打开进行中项目 → 首屏可见返回、标题、步骤徽章与更多；点返回回列表；更多 → 删除仍可用
- Interface: 步骤 1（含平台折叠）、中段步骤、≤900px 窄屏；标题较长时截断/换行不遮挡更多按钮
- System: 无第二套返回链接样式；仍用 `shared.backLink`
- Repository: `cd creator && npm test -- --run src/pages/ProjectDetailPage.test.tsx` → pass；`cd creator && npm run lint` → pass

## Stop conditions

- Stop if 合并后更多菜单在窄屏无法打开或与 sticky 头叠层冲突且需改 `CreatorLayout` z-index
- Stop if 产品要求完成态也必须同一头带（则需扩 scope 到 `ProjectCompletedView`）

## Design documentation

- After acceptance and validation: 在 `creator/FRONTEND.md`「共享组件」或向导相关一句中注明：进行中向导页头为单带（返回/更多 + compact hero），完成态可保留独立 toolbar；或 none（若认为实现自解释）
