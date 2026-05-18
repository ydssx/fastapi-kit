# fastapi-kit 管理后台前端开发规范

本文档约定 `admin/`（React 19 + Vite + TypeScript）的开发方式，与仓库根目录 `AGENTS.md` 中的 Docker / API 说明配合使用。

---

## 1. 技术栈与约束

| 类别 | 选型 | 说明 |
|------|------|------|
| 框架 | React 19 | 函数组件 + Hooks |
| 构建 | Vite 8 | `base: '/admin/'`，部署在 Caddy `/admin/` 子路径 |
| 语言 | TypeScript | 严格模式（`tsc -b` 必须通过） |
| 路由 | react-router-dom 7 | `BrowserRouter` 的 `basename="/admin"` |
| 服务端状态 | TanStack Query 5 | 列表/仪表盘等用 `useQuery` / `useMutation` |
| 样式 | CSS Modules | 无 Tailwind / UI 库；全局 token 在 `index.css` |
| HTTP | 原生 `fetch` | 统一经 `api/client.ts` 的 `apiFetch` |

**禁止**：在页面里直接 `fetch` 并自行解析信封（除 CSV 导出等非 JSON 响应）；在组件内写内联全局样式；引入与现有 token 冲突的第二套配色。

---

## 2. 目录结构

```
admin/
├── index.html          # 字体与入口
├── vite.config.ts      # base、/api 开发代理
├── src/
│   ├── main.tsx
│   ├── index.css       # 设计 token（:root）
│   ├── App.tsx         # 路由表
│   ├── api/            # 按资源拆分：auth、users、audit…
│   ├── auth/           # AuthContext、登录态
│   ├── components/     # 可复用 UI（DataTable、PageHeader…）
│   ├── layouts/        # AdminLayout（侧栏 + 顶栏）
│   ├── pages/          # 路由级页面 + 同名 *.module.css
│   ├── styles/         # 跨页共享样式模块（shared.module.css）
│   └── types/          # api.ts：与后端响应对齐的 TS 类型
└── FRONTEND.md         # 本文档
```

**新增页面 checklist**

1. 在 `pages/` 新建 `XxxPage.tsx` + `XxxPage.module.css`
2. 在 `App.tsx` 注册路由（需登录的放在 `ProtectedRoute` + `AdminLayout` 下）
3. 在 `layouts/AdminLayout.tsx` 的 `NAV` 中增加导航（如需要）
4. 在 `api/` 增加接口函数；类型写入 `types/api.ts`
5. 使用下文「页面骨架」与共享样式

---

## 3. 设计系统

### 3.1 视觉定位

运维向管理台：**深色侧栏 + 浅色工作区 + 靛蓝强调 + 等宽字体展示遥测数据**。文案偏实用（状态、操作、筛选），避免营销腔。

### 3.2 设计 Token（`src/index.css`）

新增颜色、圆角、阴影时**只**在 `:root` 扩展变量，组件通过 `var(--*)` 引用：

| Token | 用途 |
|-------|------|
| `--accent` / `--accent-hover` | 主按钮、链接、焦点环 |
| `--sidebar-bg` / `--sidebar-text` | 侧栏 |
| `--surface` / `--surface-muted` / `--surface-hover` | 卡片、表格、主内容区背景 |
| `--border` | 边框 |
| `--text` / `--text-muted` | 正文 / 次要文案 |
| `--font-sans` / `--font-mono` | 界面 / ID、指标、代码 |
| `--radius` | 统一圆角（8px） |
| `--shadow-sm` / `--shadow-md` | 卡片、弹层 |
| `--danger-*` / `--warn-*` | 错误、告警条 |

**不要**在业务 CSS 中硬编码 `#4f46e5` 等色值（已有 token 的除外）。

### 3.3 共享样式（`src/styles/shared.module.css`）

页面级统一使用：

| 类名 | 用途 |
|------|------|
| `.page` | 页面根容器（间距 + 入场动画） |
| `.pageHeader` / `.pageTitle` / `.pageDesc` | 与 `PageHeader` 组件配合 |
| `.toolbar` | 筛选区、按钮组 |
| `.input` | 文本、搜索、datetime 输入 |
| `.btnPrimary` / `.btnSecondary` | 主操作 / 次操作 |
| `.section` / `.sectionTitle` | 内容分区（全大写小节标题） |
| `.notice` | 黄底提示条 |
| `.loading` / `.spinner` | 加载态 |
| `.pagination` | 分页条 |
| `.muted` / `.errorText` | 次要文字 / 错误 |

页面特有样式放在 `pages/XxxPage.module.css`，仅放该页独有布局。

### 3.4 复用组件

| 组件 | 职责 |
|------|------|
| `PageHeader` | 标题、可选描述、右侧 `actions` 插槽 |
| `LoadingBlock` | 统一加载指示（`role="status"`） |
| `DataTable` | 列配置 + 空状态文案 |
| `StatusBadge` | 状态 pill（ok / degraded / error / active…） |
| `ProtectedRoute` | 未登录跳转 `/login` |
| `AdminLayout` | 侧栏导航 + 顶栏 + `<Outlet />` |

扩展 UI 时优先**扩展现有组件**，避免同页复制一套表格/分页样式。

---

## 4. 页面实现规范

### 4.1 标准骨架

```tsx
import shared from '../styles/shared.module.css'
import { PageHeader } from '../components/PageHeader'
import { LoadingBlock } from '../components/LoadingBlock'

export function ExamplePage() {
  const { data, isLoading, error } = useQuery({ ... })

  if (isLoading) {
    return (
      <div className={shared.page}>
        <PageHeader title="页面标题" description="可选说明" />
        <LoadingBlock />
      </div>
    )
  }

  if (error) {
    return (
      <div className={shared.page}>
        <PageHeader title="页面标题" />
        <p className={shared.errorText} role="alert">
          加载失败：{(error as Error).message}
        </p>
      </div>
    )
  }

  return (
    <div className={shared.page}>
      <PageHeader
        title="页面标题"
        description="如：每 30 秒自动刷新"
        actions={/* 筛选表单或按钮 */}
      />
      {/* 分区：shared.section + shared.sectionTitle */}
    </div>
  )
}
```

### 4.2 数据列表页

- `useQuery` 的 `queryKey` 包含**所有筛选维度**（页码、关键字、日期等）
- 筛选提交时重置 `page` 为 1
- 表格用 `DataTable`；分页用 `shared.pagination`
- 破坏性操作（改角色、停用、重置密码）必须 **`confirm()`** 二次确认
- 错误信息展示 API 返回的 `message`（`ApiError`）

### 4.3 仪表盘 / 多区块页

- 按**运维语义**分区（如「运行健康」「用户」「指标」），不要单一大网格堆砌
- 统计块可用局部 `StatCard` + `animationDelay` 做错峰 `fadeUp`
- 自动刷新在 `PageHeader` 的 `description` 中说明间隔

### 4.4 弹层与导出

- 详情弹层：遮罩 + `role="dialog"` + 点击遮罩关闭；样式可参考 `AuditLogsPage.module.css`
- **CSV 等非 JSON 下载**：使用 `fetch` + `Blob`，见 `api/audit.ts` 的 `downloadAuditExport`；不要走 `apiFetch`

---

## 5. API 与类型

### 5.1 信封格式

后端统一：

```json
{ "code": 0, "message": "ok", "data": { ... } }
```

- `code !== 0` 或 HTTP 非 2xx → `ApiError`
- 业务数据在 `data` 字段

### 5.2 `apiFetch`

```ts
// 读
const users = await apiFetch<Paginated<UserPublic>>('/api/v1/admin/users?page=1')

// 写
await apiFetch<UserPublic>(`/api/v1/admin/users/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(payload),
})
```

- 路径以 `/api/v1/...` 开头（开发时由 Vite 代理到 `https://localhost`）
- 401 时自动尝试 refresh token 并重试一次
- 新增接口：在 `api/*.ts` 封装；响应类型加到 `types/api.ts`

### 5.3 与后端字段对齐

- 字段名与 OpenAPI / `app/schemas` 一致，**不做**前端随意 rename
- 日期时间：接口为 ISO 8601 字符串；展示用 `toLocaleString('zh-CN')`
- 分页结构：`{ items, total, page, page_size }`

---

## 6. 认证与路由

- Token 存 `localStorage`，键名 `fastapi_kit_admin_tokens`（见 `api/client.ts`）
- `AuthContext` 提供 `login` / `logout` / `user`
- 路由路径**不要**写 `/admin` 前缀（已由 `basename` 处理），例如 `to="/users"` 而非 `to="/admin/users"`
- 对外访问 URL：**`https://localhost/admin/`**（无尾斜杠的 `/admin` 由 Caddy 301 到 `/admin/`）

---

## 7. 文案与可访问性

### 7.1 文案

- 界面语言：**简体中文**
- 标题说清「是什么」：用户管理、审计日志、Celery 监控
- 按钮用动词：筛选、导出 CSV、刷新、重置密码
- 避免空洞文案（如「体验无缝集成」）；错误信息用后端 `message` 或简短中文说明

### 7.2 可访问性（最低要求）

- 表单控件配 `<label>` 或 `aria-label`
- 错误区域 `role="alert"`
- 加载 `LoadingBlock` 带 `aria-live="polite"`
- 依赖全局 `:focus-visible` 样式，不要 `outline: none` 且无替代
- 语义化标签：`main` 由 layout 承担；表格用真实 `<table>`（`DataTable` 已满足）

---

## 8. 动效

- 页面进入：`shared.page` 的 `pageIn`（约 0.35s）
- 仪表盘卡片：可选 `fadeUp` + `animation-delay` 错峰
- 表格行：已有 hover 背景过渡
- **禁止**大面积无意义动画；动效应帮助层级或反馈状态

---

## 9. 开发与构建

```bash
# 本机开发（API 代理到 https://localhost）
cd admin && npm ci && npm run dev
# → http://localhost:5173/admin/

# 生产构建（输出 admin/dist/）
npm run build

# 与 Docker 一体（推荐）
# 根目录 make up → proxy 镜像内嵌 admin 构建产物
docker compose build proxy && docker compose up -d proxy

# 仅热重载容器
make admin-docker-dev
```

| 命令 | 说明 |
|------|------|
| `npm run lint` | ESLint |
| `npm run build` | `tsc -b` + Vite 打包，CI 应执行 |

环境变量：

| 变量 | 场景 |
|------|------|
| `VITE_API_PROXY` | 开发代理目标，默认 `https://localhost`；compose 内 `admin-dev` 为 `https://proxy` |

---

## 10. 代码风格

- **组件**：一个文件一个主要导出；页面组件命名 `XxxPage`
- **Hooks**：数据请求用 TanStack Query；不把服务端列表塞进 `useState` 长期缓存
- **类型**：避免 `any`；API 响应用 `types/api.ts` 中的 interface
- **导入顺序**：React → 第三方 → `@/` 或相对路径组件 → 样式模块
- **CSS Modules**：类名 camelCase；组合 `shared` + 页面 module，例如 `className={shared.page}`

---

## 11. 反模式（避免）

| 反模式 | 正确做法 |
|--------|----------|
| 每页复制一套按钮/分页 CSS | 使用 `shared.module.css` |
| 在页面里解析 `response.json()` 不校验 `code` | 使用 `apiFetch` |
| 路由写 `/admin/users` | 写 `/users`（basename 已含 `/admin`） |
| 硬编码 API 主机 `http://localhost:8000` | 相对路径 `/api/...` + 代理 |
| 管理操作无确认 | `confirm()` 或后续统一 Modal |
| 新增页不进侧栏、不注册路由 | 按 checklist 补全 |
| 随意新增 UI 库 / CSS 框架 | 保持 CSS Modules + token 一致 |

---

## 12. 相关文档

- 仓库根目录 `AGENTS.md`：Docker、admin 启动、管理 API 前缀
- `docs/solutions/integration-issues/admin-caddy-path-without-trailing-slash-2026-05-18.md`：`/admin` 与 `/admin/` 路由说明
- 后端管理 API：`/api/v1/admin/*`（需 `role=admin` 的 JWT）

---

## 13. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-05-18 | 初版：基于二期 admin 打磨后的目录与 shared 样式约定 |
