# 创作者工作台前端

与 `admin/FRONTEND.md` 相同约定：Vite、`base: '/creator/'`、`apiFetch` 信封、CSS Modules、TanStack Query。

## 开发与构建

- 开发：`make creator-dev`（:5174，`/api` 代理到 `https://localhost`）
- 构建：`make creator-build`（Compose 构建 proxy 时会自动执行）

## 视觉定位

暗色编辑室 + 琥珀强调色（`--accent #f2b84b`）+ 完成态绿（`--success #4ade80`）。Token 定义在 `src/index.css`。

## 共享组件（`src/components/`）

| 组件 | 用途 |
|------|------|
| `PageHeader` | 页面标题 + 描述 |
| `LoadingBlock` | 加载 spinner |
| `QuotaDisplay` / `QuotaLimitNotice` | 顶栏用量 / 402 限额提示 |
| `EmptyState` | 列表空态 |
| `ProjectCard` / `PlatformPicker` / `PipelineThumbnail` | 项目列表 |
| `StepProgress` / `StepEditorPanel` / `AiLoadingOverlay` | 流水线向导 |
| `PublishChecklist` / `CompletedBanner` / `StepVersionHistory` | 变体态 |
| `BrandField` | 品牌档案字段 + 字数 |

## UI 验收

对照 `docs/prototypes/` 8 张 PNG；已知差异见 `docs/prototypes/README.md`「实现已知差异」。

## 禁止

- Tailwind / UI 库
- 页面内裸 `fetch`
- 硬编码色值（使用 `var(--*)`）
