# 创作者工作台前端

与 `admin/FRONTEND.md` 相同约定：Vite、`base: '/creator/'`、`apiFetch` 信封、CSS Modules、TanStack Query。

## 开发与构建

- 开发：`make creator-dev`（:5174，`/api` 代理到 `https://localhost`）
- 构建：`make creator-build`（Compose 构建 proxy 时会自动执行）

## 视觉定位

**工作室侧栏**布局：桌面端固定左侧导航（248px），主内容区居中；移动端顶栏 + 折叠菜单。

配色为暖墨底色 + **珊瑚强调色**（`--accent #ff6e40`）+ **薄荷 AI 色**（`--ai #5eead4`）+ 完成态绿（`--success #6ee7a8`）。面板顶部有「舞台光」细线（`--stage-line`）作为签名元素。

字体：`--font-display`（Fraunces）、`--font`（Outfit）、`--font-mono`（JetBrains Mono，用于标签与数据）。Token 定义在 `src/index.css`。

## 断点

- 壳层与页面布局统一用 **900px**（与 `--bp-nav` / `--bp-wizard` 一致）：侧栏折叠、双栏改单栏。
- 更窄堆叠用 **640px**（`--bp-narrow`）。
- 组件内部不必另起 768/800/960/980 等接近值。

## 产品术语（对用户可见文案）

| 内部 / 代码 | 用户文案 |
|-------------|----------|
| Playground | 灵感实验室 |
| Refine | 打磨 / 优化想法 |
| Handoff | 交接到项目 |
| Checklist | 发布核对 |

## 共享组件（`src/components/`）

| 组件 | 用途 |
|------|------|
| `PageHeader` | 页面标题 + 描述 |
| `LoadingBlock` | 加载 spinner |
| `QuotaDisplay` / `QuotaLimitNotice` | 顶栏用量 / 402 限额提示 |
| `EmptyState` | 列表空态 |
| `ProjectCard` / `ProjectSprintCard` / `SprintHubSection` / `PlatformPicker` / `PipelineThumbnail` | 项目列表与冲刺区 |
| `UserMenu` | 顶栏账号菜单 |
| `ContextChips` | 向导顶栏品牌 + 上步摘要芯片 |
| `AiSuggestionPanel` | AI 建议预览、采纳、快捷调整、配额态 |
| `StepWorkspace` | 双栏布局（编辑区 + AI 面板），含移动端折叠 |
| `StepProgress` / `StepEditorPanel` / `AiLoadingOverlay` | 流水线向导 |
| `SelectionRewriteFloat` | 选区旁悬浮改写条（portal 定位；预览确认后写入） |
| `PublishChecklist` / `CompletedBanner` / `StepVersionHistory` | 变体态 |
| `BrandField` | 品牌档案字段 + 字数 |
| `assets/*` | 素材库创建面板、网格、Lightbox、共享缩略图 |

进行中向导与完成态页头均为单带 chrome（返回 / 更多）；前两步目标平台只在折叠条展示，hero meta 不重复平台名。

## UI 验收

对照 `creator/docs/prototypes/v2/` 10 张 PNG 与 README；v1 资产见 `creator/docs/prototypes/`。v2 截图为 2026-06-11 顶栏布局；2026-06-25 侧栏重设计后，视觉 token 与布局以本文及 `docs/solutions/design-patterns/creator-workspace-ui-redesign-studio-sidebar.md` 为准，原型图待重新截图。

## 禁止

- Tailwind / UI 库
- 页面内裸 `fetch`
- 硬编码色值（使用 `var(--*)`）
