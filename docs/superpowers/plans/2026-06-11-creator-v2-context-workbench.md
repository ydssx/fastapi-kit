---
status: completed
completed_date: 2026-07-15
note: "Progress checkboxes refreshed against current codebase; treat as shipped reference."
---

# Creator v2 上下文工作台 Implementation Plan

> **Shipped reference:** 本文已按现网代码标记为 `completed`。不要按 checkbox 重新实现；仅作历史实现与文件职责参考。

**Goal:** 将 Creator 向导页从「AI 按钮」升级为「上下文工作台」（双栏编辑区 + AI 内嵌面板），补齐 v2 原型资产与关联页面改版，使品牌记忆与上步上下文在向导内可见。

**Architecture:** 分两波交付——**Wave 1** 产出 `creator/docs/prototypes/v2/` 10 张 mock 与 README；**Wave 2** 先扩展 `ai-suggest` 支持可选 `adjustment` 参数（快捷调整 chips），再在前端新增 `ContextChips`、`AiSuggestionPanel`、`StepWorkspace` 组件并重构 `ProjectDetailPage`，建议预览与编辑区状态分离，进入第 3 步起自动拉取 AI 建议（仅当编辑区为空）。后端其余 API 不变。

**Tech Stack:** React 19 + Vite + CSS Modules + TanStack Query（`creator/`）；FastAPI + Pydantic（`app/api/v1/creator/`）；pytest + httpx（`tests/api/`）

**Spec:** `docs/superpowers/specs/2026-06-11-creator-product-prototype-design.md`

---

## File Map

| 文件 | 职责 |
|------|------|
| `creator/docs/prototypes/v2/README.md` | v2 原型索引、与 v1 差异、验收清单 |
| `creator/docs/prototypes/v2/*.png` | 10 张高保真 mock |
| `creator/src/index.css` | 新增 `--panel`、`--ai-panel`、`--bp-wizard: 900px` |
| `creator/src/lib/stepAiAdjustments.ts` | 每步快捷调整 chip 配置 |
| `creator/src/components/ContextChips.tsx` | 品牌 + 上步摘要芯片条 |
| `creator/src/components/AiSuggestionPanel.tsx` | AI 建议预览、采纳、调整、loading、配额态 |
| `creator/src/components/StepWorkspace.tsx` | 双栏布局（编辑区 + AI 面板），含移动端折叠 |
| `creator/src/pages/ProjectDetailPage.tsx` | 向导页编排：自动拉取建议、预览态、去除全屏 overlay |
| `creator/src/components/ProjectCard.tsx` | 7 圆点步骤进度 |
| `creator/src/pages/BrandPage.tsx` | 「预览效果」区（纯前端示例句） |
| `creator/src/components/PublishChecklist.tsx` | 顶部平台汇总条 |
| `creator/src/api/creator.ts` | `aiSuggest` 增加可选 `adjustment` body |
| `app/schemas/creator.py` | `AiSuggestIn` |
| `app/api/v1/creator/ai.py` | 接收 request body |
| `app/creator/prompts/__init__.py` | `adjustment` 注入 user prompt |
| `app/services/creator_ai.py` | 传递 `adjustment` |
| `tests/api/test_creator_ai.py` | adjustment 与 regression |
| `creator/FRONTEND.md` | 更新组件表与 v2 验收路径 |

---

## Wave 1 — v2 原型资产

### Task 1: v2 原型目录与 README

**Files:**
- Create: `creator/docs/prototypes/v2/README.md`

- [x] **Step 1: 创建 README**

```markdown
# Creator v2 原型（上下文工作台）

基于 `docs/superpowers/specs/2026-06-11-creator-product-prototype-design.md`。

## 核心页面

| 文件 | 页面 |
|------|------|
| `prototype-v2-login.png` | 登录/注册 |
| `prototype-v2-projects.png` | 项目列表（有项目） |
| `prototype-v2-wizard.png` | 项目向导（双栏 + 上下文芯片） |
| `prototype-v2-brand.png` | 品牌档案 + 预览效果 |
| `prototype-v2-publish.png` | 发布核对 |
| `prototype-v2-completed.png` | 项目完成态 |

## 变体

| 文件 | 状态 |
|------|------|
| `prototype-v2-projects-empty.png` | 空列表 |
| `prototype-v2-wizard-ai-loading.png` | AI 面板 loading |
| `prototype-v2-wizard-quota.png` | AI 配额用尽 |
| `prototype-v2-wizard-mobile.png` | ≤900px 窄屏 |

## 与 v1 差异

- 向导页：固定 AI 右栏（非按钮触发）
- 顶栏：上下文芯片（品牌 + 上步摘要）
- AI 建议：面板预览 → 显式采纳

## 验收

对照 spec Success Criteria 五项勾选。
```

- [x] **Step 2: Commit**

```bash
git add creator/docs/prototypes/v2/README.md
git commit -m "docs: add creator v2 prototype README"
```

---

### Task 2: 生成 P3 核心向导 mock（阻塞视觉评审）

**Files:**
- Create: `creator/docs/prototypes/v2/prototype-v2-wizard.png`

- [x] **Step 1: 生成高保真 mock**

使用图像生成工具，提示词要点：

- 暗色 UI，背景 `#0c0f14`，琥珀强调 `#f2b84b`
- 桌面宽屏，中文界面
- 顶栏：「← 项目列表 · 初夏穿搭 3 件套 · 短视频 · 抖音/小红书 · 步骤 3/7」
- 7 步进度条，第 3 步高亮
- 上下文芯片行：「语气:口语化」「受众:18-25女性」「禁:夸张承诺」「上步:钩子…」
- 左栏「口播脚本」大 textarea；右栏「AI 建议 · 口播脚本」预览区 + 按钮「采纳全部」「插入」「换一版」+ chips「更口语」「更短」
- 右栏左侧 3px 琥珀竖线，背景略深 `#141a22`
- 底栏：「暂存草稿」「确认并下一步 →」

- [x] **Step 2: 放入 v2 目录并 Commit**

```bash
git add creator/docs/prototypes/v2/prototype-v2-wizard.png
git commit -m "docs: add creator v2 wizard prototype mock"
```

---

### Task 3: 生成其余 9 张 mock

**Files:**
- Create: `creator/docs/prototypes/v2/prototype-v2-*.png`（9 张）

- [x] **Step 1: 按 spec Screen Inventory 逐张生成**

每张沿用相同 token 与字体（DM Sans）。P3 变体三张可基于 P3 改状态（骨架屏、配额提示、底部抽屉布局）。

- [x] **Step 2: Commit**

```bash
git add creator/docs/prototypes/v2/
git commit -m "docs: add creator v2 prototype set (10 screens)"
```

> **备选：** Wave 2 前端实现完成后，用 `make creator-dev` + 浏览器截图替换/补充 mock，README 注明「实现截图版」日期。

---

## Wave 2 — 后端：AI 快捷调整参数

### Task 4: `AiSuggestIn` schema 与 prompt adjustment

**Files:**
- Modify: `app/schemas/creator.py`
- Modify: `app/creator/prompts/__init__.py`
- Modify: `app/services/creator_ai.py`
- Modify: `app/api/v1/creator/ai.py`
- Test: `tests/api/test_creator_ai.py`

- [x] **Step 1: 写失败测试**

在 `tests/api/test_creator_ai.py` 末尾追加：

```python
@pytest.mark.asyncio
async def test_ai_suggest_with_adjustment(
    client: AsyncClient,
    test_settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_settings.llm_api_key = "test-key"
    captured: list[str] = []

    async def fake_complete(_self, _system: str, user_prompt: str) -> str:
        captured.append(user_prompt)
        return "更口语的脚本"

    monkeypatch.setattr("app.clients.llm.LlmClient.complete", fake_complete)

    token = await register_token(client, "creator-ai-adj@example.com")
    project = await create_short_video_project(client, token)
    # 推进到 script 步（topic → hook → script）
    for step_key, content in [("topic", "选题"), ("hook", "钩子")]:
        await client.post(
            f"/api/v1/creator/projects/{project['id']}/steps/{step_key}/confirm",
            headers=auth_headers(token),
            json={"content": content},
        )
    project = (
        await client.get(
            f"/api/v1/creator/projects/{project['id']}",
            headers=auth_headers(token),
        )
    ).json()["data"]

    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/steps/script/ai-suggest",
        headers=auth_headers(token),
        json={"adjustment": "更口语"},
    )
    assert response.status_code == 200
    assert "更口语" in captured[-1]
```

- [x] **Step 2: 运行测试确认 FAIL**

```bash
uv run pytest tests/api/test_creator_ai.py::test_ai_suggest_with_adjustment -v
```

Expected: FAIL（422 或 adjustment 未进入 prompt）

- [x] **Step 3: 实现 schema**

`app/schemas/creator.py` 增加：

```python
class AiSuggestIn(BaseModel):
    adjustment: str | None = Field(default=None, max_length=100)
```

- [x] **Step 4: 更新 prompt builder**

`app/creator/prompts/__init__.py` — `build_step_prompt` 签名增加 `adjustment: str | None = None`，在 `user_parts` 末尾：

```python
    if adjustment:
        user_parts.append(f"\n额外要求: {adjustment}")
```

- [x] **Step 5: 更新 service 与 route**

`app/services/creator_ai.py` — `suggest` 增加 `adjustment: str | None = None`，传入 `build_step_prompt`。

`app/api/v1/creator/ai.py`：

```python
@router.post(...)
async def ai_suggest(
    user: CurrentUser,
    db: DbSession,
    project_id: uuid.UUID,
    step_key: str,
    body: AiSuggestIn | None = None,
) -> ApiResponse[AiSuggestOut]:
    adj = body.adjustment if body else None
    data = await CreatorAiService(db).suggest(user, project_id, step_key, adjustment=adj)
    return ApiResponse(data=data)
```

- [x] **Step 6: 运行测试确认 PASS**

```bash
uv run pytest tests/api/test_creator_ai.py -v
```

Expected: 全部 PASS

- [x] **Step 7: Commit**

```bash
git add app/schemas/creator.py app/creator/prompts/__init__.py app/services/creator_ai.py app/api/v1/creator/ai.py tests/api/test_creator_ai.py
git commit -m "feat(creator): support optional adjustment on ai-suggest"
```

---

## Wave 2 — 前端：设计 token 与配置

### Task 5: CSS token 与步骤调整配置

**Files:**
- Modify: `creator/src/index.css`
- Create: `creator/src/lib/stepAiAdjustments.ts`

- [x] **Step 1: 添加 token**

`creator/src/index.css` `:root` 内追加：

```css
  --panel: #1a2030;
  --ai-panel: #141a22;
  --bp-wizard: 900px;
```

- [x] **Step 2: 创建 stepAiAdjustments**

`creator/src/lib/stepAiAdjustments.ts`：

```typescript
/** 每步快捷调整 chip：label 展示，adjustment 传给 API */
export const STEP_AI_ADJUSTMENTS: Record<string, { label: string; adjustment: string }[]> = {
  topic: [{ label: '再给 3 个角度', adjustment: '提供 3 个不同选题角度' }],
  hook: [{ label: '再给 3 个角度', adjustment: '提供 3 个不同钩子角度' }],
  script: [
    { label: '更口语', adjustment: '更口语' },
    { label: '更短', adjustment: '更简短' },
    { label: '加强钩子', adjustment: '开头钩子更强' },
  ],
  storyboard: [
    { label: '更细', adjustment: '分镜更细致' },
    { label: '更简', adjustment: '分镜更精简' },
  ],
  cover: [
    { label: '更吸引点击', adjustment: '标题更吸引点击' },
    { label: '更 SEO', adjustment: '标题更利于搜索' },
  ],
  assets: [{ label: '更简', adjustment: '素材清单更精简' }],
  outline: [{ label: '更细', adjustment: '大纲更细致' }],
  body: [
    { label: '更口语', adjustment: '更口语' },
    { label: '更短', adjustment: '更简短' },
  ],
  summary: [
    { label: '更吸引点击', adjustment: '标题更吸引点击' },
    { label: '更 SEO', adjustment: '更利于搜索' },
  ],
  visuals: [
    { label: '更细', adjustment: '配图要点更细' },
    { label: '更简', adjustment: '配图要点更简' },
  ],
  seo: [
    { label: '更吸引点击', adjustment: '多平台标题更吸引点击' },
    { label: '更 SEO', adjustment: '关键词与话题更利于搜索' },
  ],
}

export function adjustmentsForStep(stepKey: string) {
  return STEP_AI_ADJUSTMENTS[stepKey] ?? []
}

/** 进入步骤时是否自动拉取 AI（第 3 步起，0-based index >= 2） */
export function shouldAutoSuggest(stepIndex: number, aiEnabled: boolean, editorEmpty: boolean) {
  return aiEnabled && editorEmpty && stepIndex >= 2
}
```

- [x] **Step 3: Commit**

```bash
git add creator/src/index.css creator/src/lib/stepAiAdjustments.ts
git commit -m "feat(creator): v2 design tokens and step AI adjustment config"
```

---

## Wave 2 — 前端：核心组件

### Task 6: ContextChips 组件

**Files:**
- Create: `creator/src/components/ContextChips.tsx`
- Create: `creator/src/components/ContextChips.module.css`

- [x] **Step 1: 实现组件**

```tsx
import { Link } from 'react-router-dom'
import type { BrandProfile } from '../types/api'
import styles from './ContextChips.module.css'

interface ContextChipsProps {
  brand: BrandProfile
  prevStepTitle?: string
  prevStepSummary?: string
}

function truncate(s: string, max = 24) {
  const t = s.trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

export function ContextChips({ brand, prevStepTitle, prevStepSummary }: ContextChipsProps) {
  const chips: { label: string; to?: string }[] = []
  if (brand.tone.trim()) chips.push({ label: `语气:${truncate(brand.tone, 12)}`, to: '/brand' })
  if (brand.audience.trim()) chips.push({ label: `受众:${truncate(brand.audience, 12)}`, to: '/brand' })
  if (brand.taboos.trim()) chips.push({ label: `禁:${truncate(brand.taboos, 12)}`, to: '/brand' })
  if (prevStepTitle && prevStepSummary?.trim()) {
    chips.push({ label: `上步:${truncate(prevStepSummary, 20)}` })
  }
  if (chips.length === 0) return null

  return (
    <div className={styles.bar} role="list" aria-label="创作上下文">
      {chips.map((c) =>
        c.to ? (
          <Link key={c.label} to={c.to} className={styles.chip} role="listitem">
            {c.label}
          </Link>
        ) : (
          <span key={c.label} className={styles.chip} role="listitem">
            {c.label}
          </span>
        ),
      )}
    </div>
  )
}
```

CSS：深底、`border: 1px solid var(--accent)`、`border-radius: 999px`、横向 `overflow-x: auto`。

- [x] **Step 2: Commit**

```bash
git add creator/src/components/ContextChips.tsx creator/src/components/ContextChips.module.css
git commit -m "feat(creator): add ContextChips for wizard brand context"
```

---

### Task 7: AiSuggestionPanel 组件

**Files:**
- Create: `creator/src/components/AiSuggestionPanel.tsx`
- Create: `creator/src/components/AiSuggestionPanel.module.css`
- Modify: `creator/src/api/creator.ts`

- [x] **Step 1: 扩展 API client**

```typescript
export function aiSuggest(
  projectId: string,
  stepKey: string,
  adjustment?: string,
): Promise<{ suggestion: string }> {
  return apiFetch<{ suggestion: string }>(
    `/api/v1/creator/projects/${projectId}/steps/${stepKey}/ai-suggest`,
    {
      method: 'POST',
      body: JSON.stringify(adjustment ? { adjustment } : {}),
    },
  )
}
```

- [x] **Step 2: 实现 AiSuggestionPanel**

Props:

```typescript
interface AiSuggestionPanelProps {
  stepTitle: string
  suggestion: string | null
  loading: boolean
  quotaBlocked: boolean
  sourceParts: string[]
  adjustments: { label: string; adjustment: string }[]
  onAdoptAll: () => void
  onInsert: () => void
  onRegenerate: () => void
  onAdjust: (adjustment: string) => void
  mobileCollapsed?: boolean
  onToggleMobile?: () => void
}
```

结构：
- 标题 `AI 建议 · {stepTitle}`
- `loading` → 骨架屏 + 「正在结合品牌档案生成…」
- `quotaBlocked` → 内嵌 `QuotaLimitNotice kind="ai"`（非全页）
- 预览区 `pre`/`div` 只读
- 按钮行：采纳全部 / 插入光标处 / 换一版
- adjustments map 为 chip buttons
- 脚注：`基于：{sourceParts.join(' · ')}`

CSS：`background: var(--ai-panel)`、`border-left: 3px solid var(--accent)`。

- [x] **Step 3: Commit**

```bash
git add creator/src/components/AiSuggestionPanel.tsx creator/src/components/AiSuggestionPanel.module.css creator/src/api/creator.ts
git commit -m "feat(creator): add AiSuggestionPanel with adopt and adjust actions"
```

---

### Task 8: StepWorkspace 双栏布局

**Files:**
- Create: `creator/src/components/StepWorkspace.tsx`
- Create: `creator/src/components/StepWorkspace.module.css`
- Modify: `creator/src/components/StepEditorPanel.tsx`（移除 AI 按钮，仅保留编辑区与底栏）

- [x] **Step 1: 精简 StepEditorPanel**

删除 `aiEnabled`、`onAiSuggest`、`aiPending` props 与「AI 建议」按钮。保留 title、description、content、onSaveDraft、onConfirm。

在 `description` 前增加可选 `decisionHint` prop，渲染为 `本步你要决定：{decisionHint}`（取自 `step.description`）。

- [x] **Step 2: 实现 StepWorkspace**

```tsx
export function StepWorkspace({
  editor,
  aiPanel,
}: {
  editor: React.ReactNode
  aiPanel: React.ReactNode
}) {
  const [aiOpen, setAiOpen] = useState(false)
  // ≥900px: grid 1fr  minmax(280px, 36%)
  // <900px: editor full width; aiPanel in collapsible below
}
```

- [x] **Step 3: Commit**

```bash
git add creator/src/components/StepWorkspace.tsx creator/src/components/StepWorkspace.module.css creator/src/components/StepEditorPanel.tsx
git commit -m "feat(creator): add StepWorkspace dual-column layout"
```

---

### Task 9: 重构 ProjectDetailPage（核心）

**Files:**
- Modify: `creator/src/pages/ProjectDetailPage.tsx`
- Modify: `creator/src/pages/ProjectDetailPage.module.css`

- [x] **Step 1: 增加 brand query 与 suggestion 状态**

```typescript
const { data: brand } = useQuery({ queryKey: ['brand'], queryFn: fetchBrand })
const [suggestion, setSuggestion] = useState<string | null>(null)
```

`suggestion` 与 `content`（编辑区）分离——`aiMut.onSuccess` 只 `setSuggestion(data.suggestion)`，**不** `setContent`。

- [x] **Step 2: 进入步骤时自动拉取建议**

```typescript
useEffect(() => {
  if (!project || !step || isPublish) return
  setSuggestion(null)
  const idx = pipeline?.steps.findIndex((s) => s.key === project.current_step_key) ?? 0
  if (shouldAutoSuggest(idx, step.ai_enabled, !content.trim())) {
    aiMut.mutate(undefined)
  }
}, [project?.current_step_key])
```

注意：`aiMut` 需支持 `mutate(adjustment?: string)`。

- [x] **Step 3: 计算上步摘要与 sourceParts**

```typescript
function prevStepSummary(project: Project, pipeline: Pipeline): { title?: string; summary?: string } {
  const steps = pipeline.steps
  const idx = steps.findIndex((s) => s.key === project.current_step_key)
  if (idx <= 0) return {}
  const prev = steps[idx - 1]
  const art = project.artifacts.find((a) => a.step_key === prev.key)
  return { title: prev.title, summary: art?.content }
}

const sourceParts = ['品牌档案', prev.title && `步骤${prev.title}`, ...platformLabels(...)].filter(Boolean)
```

- [x] **Step 4: 组装向导 JSX**

在 `StepProgress` 与编辑区之间插入 `<ContextChips />`。

用 `<StepWorkspace editor={<StepEditorPanel ... />} aiPanel={<AiSuggestionPanel ... />} />` 替换原单块 `StepEditorPanel`。

Handlers:
- `onAdoptAll` → `setContent(suggestion ?? '')`
- `onInsert` → `setContent((c) => c + (suggestion ?? ''))`（或光标处，最简追加）
- `onRegenerate` / `onAdjust` → `aiMut.mutate(adjustment)`

- [x] **Step 5: 移除 AiLoadingOverlay**

删除 `<AiLoadingOverlay active={aiMut.isPending} />`  import 与用法；loading 由 `AiSuggestionPanel` 承担。

- [x] **Step 6: 配额提示移入 AI 面板**

`quotaError === 'ai'` 时传给 `AiSuggestionPanel quotaBlocked`，底栏 `QuotaLimitNotice` 可移除或仅保留 projects 类错误。

- [x] **Step 7: 本地验证**

```bash
make dev-init
make dev
make creator-dev
```

打开 `http://localhost:5174/creator/`，创建短视频项目，推进到步骤 3：
- 上下文芯片可见
- AI 面板自动 loading 后显示建议
- 点击「采纳全部」后内容进入编辑区
- 点击「更口语」后建议刷新且编辑区不变

- [x] **Step 8: Commit**

```bash
git add creator/src/pages/ProjectDetailPage.tsx creator/src/pages/ProjectDetailPage.module.css
git commit -m "feat(creator): v2 context workbench on project wizard"
```

---

## Wave 2 — 前端：关联页面

### Task 10: ProjectCard 7 圆点进度

**Files:**
- Modify: `creator/src/components/ProjectCard.tsx`
- Modify: `creator/src/components/ProjectCard.module.css`

- [x] **Step 1: 用圆点替换进度条**

```tsx
<div className={styles.dots} aria-label={`步骤 ${stepNum}/${totalSteps}`}>
  {Array.from({ length: totalSteps }, (_, i) => (
    <span
      key={i}
      className={
        i < stepNum - 1 ? styles.dotDone : i === stepNum - 1 ? styles.dotCurrent : styles.dotTodo
      }
    />
  ))}
</div>
```

已完成项目全部 `dotDone`；`publish` 步用 `stepNum === totalSteps`。

- [x] **Step 2: Commit**

```bash
git add creator/src/components/ProjectCard.tsx creator/src/components/ProjectCard.module.css
git commit -m "feat(creator): project card step dots per v2 spec"
```

---

### Task 11: 品牌档案预览效果区

**Files:**
- Modify: `creator/src/pages/BrandPage.tsx`
- Modify: `creator/src/pages/BrandPage.module.css`

- [x] **Step 1: 纯前端预览区（不调 API）**

```typescript
function buildPreview(form: BrandProfile): string {
  const tone = form.tone.trim() || '（未设置语气）'
  const aud = form.audience.trim() || '（未设置受众）'
  return `示例：面向${aud}，用${tone}的语气开场——「嘿，今天想跟你聊一个很多人忽略的细节…」`
}
```

表单下方增加 `预览效果` panel + 标签 chips（语气/受众/禁忌有值则显示）。

保存成功后在 panel 上方显示 `shared.notice`：「品牌档案已更新，后续 AI 建议将应用新约束」（3 秒消失）。

- [x] **Step 2: Commit**

```bash
git add creator/src/pages/BrandPage.tsx creator/src/pages/BrandPage.module.css
git commit -m "feat(creator): brand profile preview section"
```

---

### Task 12: 发布核对汇总条

**Files:**
- Modify: `creator/src/components/PublishChecklist.tsx`
- Modify: `creator/src/components/PublishChecklist.module.css`

- [x] **Step 1: 顶部汇总**

```typescript
const platforms = new Set(items.map((i) => i.platform))
const donePlatforms = new Set(
  [...platforms].filter((p) => {
    const pi = items.filter((i) => i.platform === p)
    return pi.length > 0 && pi.every((i) => i.checked)
  }),
)
const pending = items.filter((i) => !i.checked).length
```

渲染：``{donePlatforms.size}/{platforms.size} 平台已核对 · {pending} 项待完成``

- [x] **Step 2: Commit**

```bash
git add creator/src/components/PublishChecklist.tsx creator/src/components/PublishChecklist.module.css
git commit -m "feat(creator): publish checklist summary bar"
```

---

### Task 13: 文档与 FRONTEND 更新

**Files:**
- Modify: `creator/FRONTEND.md`
- Modify: `creator/docs/prototypes/v2/README.md`

- [x] **Step 1: 更新 FRONTEND.md 组件表**

新增：`ContextChips`、`AiSuggestionPanel`、`StepWorkspace`；UI 验收指向 `creator/docs/prototypes/v2/`。

- [x] **Step 2: 运行检查**

```bash
uv run ruff check app/creator app/api/v1/creator app/services/creator_ai.py app/schemas/creator.py
uv run pytest tests/api/test_creator_ai.py tests/api/test_creator_projects.py -v
cd creator && npm run build
```

- [x] **Step 3: Commit**

```bash
git add creator/FRONTEND.md creator/docs/prototypes/v2/README.md
git commit -m "docs: creator v2 context workbench acceptance paths"
```

---

## Spec Coverage Checklist

| Spec 要求 | Task |
|-----------|------|
| P1–P6 + V1–V4 原型 | Task 1–3 |
| P3 双栏 + 上下文芯片 | Task 6, 8, 9 |
| AI 预览 → 采纳 | Task 7, 9 |
| 进入步骤自动建议（第 3 步起） | Task 5, 9 |
| 快捷调整 chips | Task 4, 5, 7 |
| 配额用尽 AI 面板态 | Task 7, 9 |
| 移动端 AI 折叠 | Task 8 |
| P2 圆点进度 | Task 10 |
| P4 品牌预览 | Task 11 |
| P5 发布汇总条 | Task 12 |
| 视觉 token `--ai-panel` | Task 5 |

---

## Out of Scope（本计划不实施）

- 对话式全局 AI 副驾
- 新流水线类型或步骤数变更
- 自动发帖 API
- Playwright 视觉回归 CI
- 完成态「平台发布时间线」后端字段（P6 用现有 `publish_progress` 展示即可）

---

## Verification Gate

全部 Task 完成后：

```bash
uv run pytest tests/api/ -v -k creator
uv run ruff check .
cd creator && npm run build
```

人工冒烟：登录 → 建项 → 步骤 3 自动 AI → 采纳 → 发布核对 → 完成；窄屏 375px 检查 AI 抽屉。
