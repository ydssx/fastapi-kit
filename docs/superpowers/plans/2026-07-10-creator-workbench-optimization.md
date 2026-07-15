---
status: completed
completed_date: 2026-07-15
note: "Progress checkboxes refreshed against current codebase; treat as shipped reference."
---

# 创作者工作台优化 Implementation Plan

> **Shipped reference:** 本文已按现网代码标记为 `completed`。不要按 checkbox 重新实现；仅作历史实现与文件职责参考。

**Goal:** 让创作者工作台以可行动的发布队列和选区感知的 AI 共写流程推进内容，并在前后端可靠阻止未完成发布检查的项目完成。

**Architecture:** 保持 React、TanStack Query 与现有 Creator API 边界。为受控 `textarea` 增加纯函数选区适配层；页面负责保存选区和调用既有草稿 mutation，AI 面板只发出意图。发布检查同时在前端禁用与服务层复核，确保直接调用 API 也不能绕过。

**Tech Stack:** React 19、TypeScript 6、Vite 8、Vitest、React Testing Library、FastAPI、Pydantic、pytest。

---

## 文件结构与职责

| 文件 | 职责 |
| --- | --- |
| `creator/src/lib/editorSelection.ts` | 纯文本选区的捕获、有效性校验、插入与替换。 |
| `creator/src/components/StepEditorPanel.tsx` | 暴露 `textarea` 选区，并在输入、点击、键盘选区变化时通知父级。 |
| `creator/src/pages/ProjectDetailPage.tsx` | 维护当前草稿的选区，将 AI 采纳、插入与替换映射为草稿更新。 |
| `creator/src/components/AiSuggestionPanel.tsx` | 显示当前变体、准确的插入操作和选区失效时的降级文案。 |
| `creator/src/components/PublishChecklist.tsx` | 显示待办平台并在待办存在时禁用完成操作。 |
| `app/services/creator_project.py` | 复核发布清单，防止 API 调用绕过前端限制。 |
| `creator/src/components/PlaygroundHandoffModal.tsx` | 提供可键盘操作、可恢复焦点的交接弹窗。 |
| `creator/src/pages/ProjectsPage.tsx` 与项目卡片 CSS | 以单一发布冲刺焦点和可读的项目队列呈现既有排序。 |
| `creator/src/index.css` 与 `PipelineThumbnail.module.css` | 定义语义状态／缩略图 token，避免组件私有硬编码色。 |

### Task 1: 建立 Creator 前端测试基线

**Files:**
- Modify: `creator/package.json`
- Modify: `creator/vite.config.ts`
- Create: `creator/src/test/setup.ts`

- [x] **Step 1: 安装测试依赖**

Run:

```bash
cd creator && npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Expected: `package.json` 与 lockfile 增加五个开发依赖，命令退出码为 0。

- [x] **Step 2: 配置 Vitest 与测试 setup**

将 `creator/vite.config.ts` 的导入和配置改为：

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/creator/',
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

新增 `creator/src/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
```

在 `creator/package.json` 的 `scripts` 中加入：

```json
"test": "vitest run"
```

- [x] **Step 3: 验证空测试运行与构建**

Run:

```bash
cd creator && npm run test && npm run build
```

Expected: Vitest 报告没有测试文件但退出码为 0，随后 TypeScript 和 Vite 构建成功。

- [x] **Step 4: Commit**

```bash
git add creator/package.json creator/package-lock.json creator/vite.config.ts creator/src/test/setup.ts
git commit -m "test(creator): add frontend test baseline"
```

### Task 2: 实现选区感知的 AI 编辑

**Files:**
- Create: `creator/src/lib/editorSelection.ts`
- Create: `creator/src/lib/editorSelection.test.ts`
- Modify: `creator/src/components/StepEditorPanel.tsx`
- Modify: `creator/src/components/AiSuggestionPanel.tsx`
- Modify: `creator/src/pages/ProjectDetailPage.tsx`

- [x] **Step 1: 编写选区纯函数的失败测试**

创建 `creator/src/lib/editorSelection.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import {
  applySelectionInsertion,
  captureSelection,
  hasActiveSelection,
  isSelectionCurrent,
} from './editorSelection'

describe('editor selection', () => {
  it('replaces the captured selection and places the caret after inserted text', () => {
    const selection = captureSelection('你好世界', 2, 4)
    expect(applySelectionInsertion('你好世界', selection, '创作者')).toEqual({
      content: '你好创作者',
      selection: { start: 5, end: 5, value: '你好创作者' },
    })
  })

  it('inserts at the caret without replacing content', () => {
    const selection = captureSelection('你好世界', 2, 2)
    expect(applySelectionInsertion('你好世界', selection, '，')).toEqual({
      content: '你好，世界',
      selection: { start: 3, end: 3, value: '你好，世界' },
    })
  })

  it('rejects a selection once its source content changed', () => {
    const selection = captureSelection('原始草稿', 0, 2)
    expect(isSelectionCurrent(selection, '已修改草稿')).toBe(false)
    expect(hasActiveSelection(selection, '已修改草稿')).toBe(false)
  })
})
```

- [x] **Step 2: 运行测试确认失败**

Run:

```bash
cd creator && npm run test -- editorSelection
```

Expected: FAIL，提示无法解析 `./editorSelection`。

- [x] **Step 3: 实现无 DOM 依赖的选区适配层**

创建 `creator/src/lib/editorSelection.ts`：

```ts
export interface TextSelection {
  start: number
  end: number
  value: string
}

export function captureSelection(value: string, start: number, end: number): TextSelection {
  return { start, end, value }
}

export function isSelectionCurrent(selection: TextSelection | null, value: string): selection is TextSelection {
  return selection !== null && selection.value === value && selection.start <= selection.end
}

export function hasActiveSelection(selection: TextSelection | null, value: string): boolean {
  return isSelectionCurrent(selection, value) && selection.start !== selection.end
}

export function applySelectionInsertion(
  value: string,
  selection: TextSelection,
  insertion: string,
): { content: string; selection: TextSelection } {
  const content = `${value.slice(0, selection.start)}${insertion}${value.slice(selection.end)}`
  const caret = selection.start + insertion.length
  return { content, selection: captureSelection(content, caret, caret) }
}
```

- [x] **Step 4: 将 `textarea` 选区上报给项目详情**

在 `StepEditorPanelProps` 新增：

```ts
onSelectionChange: (selectionStart: number, selectionEnd: number) => void
```

给 `<textarea>` 增加 `onSelect`，并在 `onChange` 中同步捕获变更后的光标：

```tsx
onChange={(e) => {
  onContentChange(e.target.value)
  onSelectionChange(e.target.selectionStart, e.target.selectionEnd)
}}
onSelect={(e) => onSelectionChange(e.currentTarget.selectionStart, e.currentTarget.selectionEnd)}
```

在 `ProjectDetailPage` 引入 `TextSelection`、`applySelectionInsertion`、`captureSelection` 和 `hasActiveSelection`；使用 `useState<TextSelection | null>(null)` 保存 `editorSelection`。内容变更时将选区与最新 `content` 绑定；调用 AI 插入时只在 `hasActiveSelection(editorSelection, content)` 为真时调用 `applySelectionInsertion`，否则执行：

```ts
setContent((current) => (current ? `${current}\n\n${text}` : text))
setEditorSelection(null)
```

将 `StepEditorPanel` 的 `onSelectionChange` 连接为：

```tsx
onSelectionChange={(start, end) => setEditorSelection(captureSelection(content, start, end))}
```

- [x] **Step 5: 让 AI 面板反映真实操作**

在 `AiSuggestionPanelProps` 新增：

```ts
hasActiveSelection: boolean
onReplaceSelection: (content: string) => void
```

在操作区保留“采纳全部”和“换一版”，并使用下列分支替代旧的“插入光标处”按钮：

```tsx
{hasActiveSelection ? (
  <>
    <button type="button" className={shared.btn} onClick={() => onInsert(selectedContent)} disabled={!hasSuggestion}>
      插入选区
    </button>
    <button
      type="button"
      className={shared.btnGhost}
      onClick={() => onReplaceSelection(selectedContent)}
      disabled={!hasSuggestion}
    >
      替换选区
    </button>
  </>
) : (
  <button type="button" className={shared.btn} onClick={() => onInsert(selectedContent)} disabled={!hasSuggestion}>
    插入到末尾
  </button>
)}
```

在 `ProjectDetailPage` 中，`onInsert` 与 `onReplaceSelection` 均调用选区适配层；“插入”在选中内容前后保留换行，“替换”不添加额外换行。AI 请求开始前不清空选区；选区与草稿内容不再匹配时，面板自动显示“插入到末尾”。

- [x] **Step 6: 运行选区测试与构建**

Run:

```bash
cd creator && npm run test -- editorSelection && npm run build
```

Expected: 3 个选区测试通过，生产构建成功。

- [x] **Step 7: Commit**

```bash
git add creator/src/lib/editorSelection.ts creator/src/lib/editorSelection.test.ts creator/src/components/StepEditorPanel.tsx creator/src/components/AiSuggestionPanel.tsx creator/src/pages/ProjectDetailPage.tsx
git commit -m "feat(creator): add selection-aware AI editing"
```

### Task 3: 在前后端阻止未核对发布项目完成

**Files:**
- Create: `creator/src/components/PublishChecklist.test.tsx`
- Modify: `creator/src/components/PublishChecklist.tsx`
- Modify: `creator/src/pages/ProjectDetailPage.tsx`
- Modify: `app/services/creator_project.py`
- Modify: `tests/api/test_creator_publish.py`

- [x] **Step 1: 编写发布清单组件失败测试**

创建 `creator/src/components/PublishChecklist.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PublishChecklist } from './PublishChecklist'

const items = [
  { platform: 'xiaohongshu', platform_label: '小红书', item_key: 'cover', label: '确认封面', checked: false },
  { platform: 'douyin', platform_label: '抖音', item_key: 'caption', label: '确认文案', checked: true },
]

describe('PublishChecklist', () => {
  it('disables completion and identifies incomplete platforms', () => {
    render(<PublishChecklist items={items} onToggle={vi.fn()} onComplete={vi.fn()} completing={false} />)
    expect(screen.getByRole('button', { name: '完成项目' })).toBeDisabled()
    expect(screen.getByText('小红书还有 1 项待完成')).toBeInTheDocument()
  })
})
```

- [x] **Step 2: 运行组件测试确认失败**

Run:

```bash
cd creator && npm run test -- PublishChecklist
```

Expected: FAIL，因为按钮尚未禁用且缺少未完成平台文案。

- [x] **Step 3: 完成客户端预防与错误反馈**

在 `PublishChecklist.tsx` 中从 `items` 得出：

```ts
const pendingPlatformLabels = Object.entries(byPlatform)
  .filter(([, platformItems]) => platformItems.some((item) => !item.checked))
  .map(([platformLabel, platformItems]) => {
    const count = platformItems.filter((item) => !item.checked).length
    return `${platformLabel}还有 ${count} 项待完成`
  })
```

在完成按钮前渲染：

```tsx
{pending > 0 && (
  <p className={styles.pendingNotice} role="status">
    {pendingPlatformLabels.join('；')}
  </p>
)}
```

并改为：

```tsx
disabled={completing || pending > 0}
```

在 `ProjectDetailPage` 的发布清单更新 mutation 增加：

```ts
onError: handleApiError,
```

使更新失败沿用页面现有错误状态与重新获取的服务端数据。

- [x] **Step 4: 编写并运行服务层校验失败测试**

在 `tests/api/test_creator_publish.py` 中，使用该文件已有的 `register_token`、`create_short_video_project`、`advance_to_publish_step` 和 `auth_headers`，增加：

```python
@pytest.mark.asyncio
async def test_complete_project_rejects_incomplete_publish_checklist(client: AsyncClient) -> None:
    token = await register_token(client, "creator-incomplete-publish@example.com")
    project = await create_short_video_project(client, token)
    await advance_to_publish_step(client, token, project["id"], "short_video")

    response = await client.post(
        f"/api/v1/creator/projects/{project['id']}/complete",
        headers=auth_headers(token),
    )

    assert response.status_code == 400
    body = response.json()
    assert body["code"] == 40019
    assert body["message"] == "Complete all publish checklist items before finishing the project"
```

Run:

```bash
uv run pytest tests/api/test_creator_publish.py -k incomplete_publish_checklist -v
```

Expected: FAIL，因为 `complete_project` 当前没有检查 `publish_checklist_state`。

- [x] **Step 5: 在服务层复核清单**

在 `CreatorProjectService.complete_project` 的 `get_pipeline` 之后、遍历 artifact 之前加入：

```python
        checklist = build_publish_checklist(project.target_platforms)
        checklist_state = project.publish_checklist_state or {}
        pending_items = [
            item
            for item in checklist
            if not checklist_state.get(f"{item['platform']}:{item['item_key']}", False)
        ]
        if pending_items:
            raise AppException(
                "Complete all publish checklist items before finishing the project",
                code=40019,
                status_code=400,
            )
```

该处与 `get_publish_checklist` 使用同一 `build_publish_checklist(project.target_platforms)` 模板，不引入新 helper；API 契约和数据库 schema 均不变。

- [x] **Step 6: 运行前后端验证**

Run:

```bash
cd creator && npm run test -- PublishChecklist && npm run build
cd .. && uv run pytest tests/api/test_creator_publish.py -v
```

Expected: 前端组件测试和构建成功；发布 API 测试通过，包括未完成清单返回 40019 的场景。

- [x] **Step 7: Commit**

```bash
git add creator/src/components/PublishChecklist.tsx creator/src/components/PublishChecklist.test.tsx creator/src/pages/ProjectDetailPage.tsx app/services/creator_project.py tests/api/test_creator_publish.py
git commit -m "fix(creator): require completed publish checks"
```

### Task 4: 让灵感交接可访问且术语一致

**Files:**
- Create: `creator/src/components/PlaygroundHandoffModal.test.tsx`
- Modify: `creator/src/components/PlaygroundHandoffModal.tsx`
- Modify: `creator/src/pages/PlaygroundPage.tsx`
- Modify: `creator/src/components/PlaygroundRefinePanel.tsx`
- Modify: `creator/src/components/PlaygroundOutlinePanel.tsx`

- [x] **Step 1: 编写弹窗失败测试**

创建 `creator/src/components/PlaygroundHandoffModal.test.tsx`，包含下列最小父级测试包装器，以保留触发按钮和关闭状态：

```tsx
function HandoffHarness() {
  const [open, setOpen] = useState(false)
  const onConfirm = vi.fn()

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        交接到项目
      </button>
      <PlaygroundHandoffModal
        open={open}
        title="夏日护肤"
        brief="为敏感肌介绍防晒步骤"
        hooks="先说常见误区"
        understanding={null}
        outline={null}
        pipelines={[{ id: 'short_video', title: '短视频', description: '', steps: [] }]}
        loading={false}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
      />
    </>
  )
}
```

验证以下可观察行为：

```tsx
it('focuses the first control, traps Tab, closes on Escape, and restores the trigger', async () => {
  const user = userEvent.setup()
  render(<HandoffHarness />)

  await user.click(screen.getByRole('button', { name: '交接到项目' }))
  expect(screen.getByRole('dialog')).toHaveFocus()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '交接到项目' })).toHaveFocus()
})
```

另加一个测试选择流水线与平台后点击“创建并进入项目”，断言 `onConfirm` 收到既有 `HandoffPayload` 的 `pipeline_id`、`brief`、`target_platform_keys` 与 `primary_platform_key`。

- [x] **Step 2: 运行测试确认失败**

Run:

```bash
cd creator && npm run test -- PlaygroundHandoffModal
```

Expected: FAIL，因为现有对话框不接收 Escape，且关闭后不恢复焦点。

- [x] **Step 3: 增加焦点生命周期**

在 `PlaygroundHandoffModal.tsx` 引入 `useRef`，为对话框容器创建 `dialogRef`，并在打开时执行：

```ts
useEffect(() => {
  if (!open) return
  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialogRef.current?.focus()

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  document.addEventListener('keydown', onKeyDown)
  return () => {
    document.removeEventListener('keydown', onKeyDown)
    previouslyFocused?.focus()
  }
}, [open, onClose])
```

给 `role="dialog"` 容器设置 `ref={dialogRef}` 和 `tabIndex={-1}`。在该容器的 `onKeyDown` 中实现 Tab／Shift+Tab 循环：查询 `button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`，没有可聚焦元素时阻止 Tab；首尾元素间循环。背景点击仍调用同一个 `onClose`。

- [x] **Step 4: 更新交接语言与会话提示**

将标题和主按钮改为：

```tsx
<h2 id="handoff-title">交接到项目</h2>
<p className={shared.muted}>确认将主题、目标平台和大纲交接到新项目。创建后可在项目中继续编辑。</p>
```

保留现有 `preview`，但标题改为“将写入项目”，使主题、平台和大纲的映射可见。将 `PlaygroundPage.tsx` 的持久化提示改为：

```tsx
关闭此标签页可能丢失未交接的内容。
```

将用户可见的 `Refine`、`handoff`、`checklist` 分别替换为“优化想法”“交接到项目”“发布检查”；只改展示文案，不能改 API 字段或内部函数名。

- [x] **Step 5: 运行弹窗测试与构建**

Run:

```bash
cd creator && npm run test -- PlaygroundHandoffModal && npm run build
```

Expected: 交接弹窗测试通过，构建成功。

- [x] **Step 6: Commit**

```bash
git add creator/src/components/PlaygroundHandoffModal.tsx creator/src/components/PlaygroundHandoffModal.test.tsx creator/src/pages/PlaygroundPage.tsx creator/src/components/PlaygroundRefinePanel.tsx creator/src/components/PlaygroundOutlinePanel.tsx
git commit -m "feat(creator): make project handoff accessible"
```

### Task 5: 改善工作台队列、反馈与导航可访问性

**Files:**
- Modify: `creator/src/pages/ProjectsPage.tsx`
- Modify: `creator/src/components/ProjectSprintCard.tsx`
- Modify: `creator/src/pages/ProjectsPage.module.css`
- Modify: `creator/src/layouts/CreatorLayout.tsx`
- Modify: `creator/src/pages/ProjectDetailPage.module.css`
- Modify: `creator/src/pages/BrandPage.tsx`
- Create: `creator/src/layouts/CreatorLayout.test.tsx`

- [x] **Step 1: 编写移动导航失败测试**

创建 `creator/src/layouts/CreatorLayout.test.tsx`，用 `MemoryRouter initialEntries={['/creator/playground']}` 渲染布局及 outlet，断言桌面和移动导航内名称为“灵感实验室”的链接都有：

```tsx
expect(screen.getAllByRole('link', { name: '灵感实验室' })).toEqual(
  expect.arrayContaining([expect.objectContaining({ getAttribute: expect.any(Function) })]),
)
```

改用逐个断言：

```tsx
for (const link of screen.getAllByRole('link', { name: '灵感实验室' })) {
  expect(link).toHaveAttribute('aria-current', 'page')
}
```

- [x] **Step 2: 运行测试确认失败**

Run:

```bash
cd creator && npm run test -- CreatorLayout
```

Expected: FAIL，移动导航链接没有 `aria-current`。

- [x] **Step 3: 实现队列和可访问性修正**

在 `CreatorLayout.tsx` 移动 `Link` 上增加：

```tsx
aria-current={isActive(to) ? 'page' : undefined}
```

在 `ProjectsPage.tsx` 保持 `buildProjectPriorityView(projects, pipelines)` 作为唯一排序来源，并按下列规则调整现有渲染：

```tsx
const featuredProject = priorityView.sprintProjects[0] ?? priorityView.activeProjects[0]
const attentionCount = priorityView.sprintProjects.length
```

标题使用“今天的创作队列”，副标题根据 `attentionCount` 输出“{attentionCount} 个项目需要你的注意”或“当前没有发布阻塞”。`featuredProject` 仅渲染一次为 `featured` 的 `ProjectSprintCard`，其余项目列表排除该项目。空态描述改为“创建第一条流水线，或先去灵感实验室生成选题。”，不指向不存在的位置。

删除 `ProjectDetailPage.module.css` 中 `.titleInputCompact:focus { outline: none; }`，让全局 `:focus-visible` 恢复生效。

在 `BrandPage.tsx` 的保存成功提示上增加：

```tsx
<p className={shared.notice} role="status">
```

并为页面已有 mutation 错误提示增加 `role="alert"`。

- [x] **Step 4: 运行导航测试、lint 与构建**

Run:

```bash
cd creator && npm run test -- CreatorLayout && npm run lint && npm run build
```

Expected: 移动导航测试通过，ESLint 和构建成功。

- [x] **Step 5: Commit**

```bash
git add creator/src/pages/ProjectsPage.tsx creator/src/components/ProjectSprintCard.tsx creator/src/pages/ProjectsPage.module.css creator/src/layouts/CreatorLayout.tsx creator/src/layouts/CreatorLayout.test.tsx creator/src/pages/ProjectDetailPage.module.css creator/src/pages/BrandPage.tsx
git commit -m "feat(creator): prioritize actionable project queue"
```

### Task 6: 统一行动信号与缩略图语义色

**Files:**
- Modify: `creator/src/index.css`
- Modify: `creator/src/components/PipelineThumbnail.module.css`
- Modify: `creator/src/components/ProjectSprintCard.module.css`
- Modify: `creator/src/components/AiSuggestionPanel.module.css`

- [x] **Step 1: 定义语义 token**

在 `creator/src/index.css` 的现有 token 后增加：

```css
--action-required: var(--accent);
--ai-ready: var(--ai);
--risk: var(--warn);
--thumb-video-start: #3d3530;
--thumb-video-end: #1a1612;
--thumb-article-start: #121820;
--thumb-garment-light: #c4b5a0;
--thumb-garment-dark: #8a7d6c;
--thumb-plant-light: #6b9b6e;
--thumb-plant-dark: #3d6b42;
```

将 `--stage-line` 改为基于 `--action-required` 与 `--ai-ready` 的渐变；动画规则继续保留在现有 `prefers-reduced-motion: reduce` 块中。

- [x] **Step 2: 替换缩略图组件硬编码色**

在 `PipelineThumbnail.module.css` 中将已有渐变和阴影替换为 token，例如：

```css
.video {
  background: linear-gradient(165deg, var(--thumb-video-start) 0%, #252018 45%, var(--thumb-video-end) 100%);
}

.garment {
  background: linear-gradient(180deg, var(--thumb-garment-light), var(--thumb-garment-dark));
  box-shadow: 14px 4px 0 -2px var(--thumb-garment-dark);
}

.plant {
  background: linear-gradient(180deg, var(--thumb-plant-light), var(--thumb-plant-dark));
}
```

将项目冲刺风险边框改用 `var(--action-required)`，AI 面板就绪边框改用 `var(--ai-ready)`；不要把行动信号线作为这些状态唯一载体。

- [x] **Step 3: 运行视觉构建检查**

Run:

```bash
cd creator && npm run lint && npm run build
```

Expected: lint 和生产构建成功。

- [x] **Step 4: 手工验证**

在 `make creator-dev` 下检查：

1. 桌面、900px 与 375px 下，焦点任务、移动导航和创建入口均可见。
2. 用键盘完成“打开交接 → Tab/Shift+Tab → Escape → 焦点返回”的流程。
3. 选择 AI 文本后分别验证插入、替换和无选区的末尾插入。
4. 留一项发布检查未勾选，确认完成按钮不可用；直接调用 API 确认得到 `40019`。
5. 在系统启用减少动态时，页面不会播放额外行动信号动画。

- [x] **Step 5: Commit**

```bash
git add creator/src/index.css creator/src/components/PipelineThumbnail.module.css creator/src/components/ProjectSprintCard.module.css creator/src/components/AiSuggestionPanel.module.css
git commit -m "style(creator): apply semantic action tokens"
```

### Task 7: 全量质量门禁

**Files:**
- Modify: `docs/superpowers/specs/2026-07-10-creator-workbench-optimization-design.md`（仅在实际实现偏离已确认规格时更新）

- [x] **Step 1: 运行 Creator 完整检查**

Run:

```bash
make creator-check
cd creator && npm run test
```

Expected: ESLint、TypeScript、Vite 构建与全部前端测试均成功。

- [x] **Step 2: 运行受影响后端 API 测试**

Run:

```bash
uv run pytest tests/api/test_creator_publish.py tests/api/test_creator_playground.py -v
```

Expected: 发布清单复核与 Playground handoff 的 API 测试全部通过。

- [x] **Step 3: 检查最终改动范围**

Run:

```bash
git diff --check && git status --short
```

Expected: 无空白错误；只包含计划列出的 Creator、服务、测试和必要 lockfile 修改。

- [x] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-07-10-creator-workbench-optimization-design.md
git commit -m "docs: record creator workbench verification"
```
