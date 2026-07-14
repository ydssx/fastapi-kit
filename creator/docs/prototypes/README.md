# 创作者工作台 UI 原型图（高保真）

基于当前 `creator/` SPA 设计（暗色编辑室 + 琥珀强调色）生成的参考 mockup，用于评审布局与信息结构；**非**像素级设计交付物。

## 核心页面

| 文件 | 页面 |
|------|------|
| `prototype-login.png` | 登录 / 注册 |
| `prototype-projects.png` | 内容项目列表 + 新建表单（有项目） |
| `prototype-project-detail.png` | 短视频向导 · 步骤 2（钩子/提纲） |
| `prototype-brand.png` | 品牌档案 |

## 补充状态 / 变体

| 文件 | 页面 |
|------|------|
| `prototype-projects-empty.png` | 项目列表空态（引导创建首条流水线） |
| `prototype-long-article.png` | 长图文向导 · 步骤 3（正文） |
| `prototype-publish-checklist.png` | 短视频 · 步骤 7（发布核对 checklist） |
| `prototype-project-completed.png` | 项目完成态 + 已确认步骤归档 |

## 设计要点

- **主色**：背景 `#0c0f14`，强调色 `#f2b84b`（琥珀），完成态 `#4ade80`（绿）
- **字体**：DM Sans
- **核心流程**：短视频 / 长图文各 7 步流水线；最后一步为各平台发布 checklist
- **交互参考**：项目详情页「确认并下一步」应即时推进步骤（见 `ProjectDetailPage`）

## 可继续扩展（未生成）

- 注册表单（与登录同屏切换）— **已实现** login/register 切换
- 配额用尽 / 错误提示态 — **已实现** `QuotaLimitNotice`
- 移动端窄屏布局 — **已实现** ≤720px 汉堡菜单
- AI 建议生成中 loading 态 — **已实现** `AiLoadingOverlay`

## 实现已知差异（相对 mock）

| 原型元素 | 实现 |
|----------|------|
| 项目卡片摄影缩略图 | `PipelineThumbnail` 按流水线类型渐变占位 |
| 详情页预计发布日期 | 省略（无后端字段） |
| 登录页「忘记密码」 | 省略（无后端） |
| 品牌页左侧多级侧栏 | 省略；使用顶栏「项目 / 品牌档案」 |
| mock 背景导航（数据看板、素材库等） | 不落地 |

生成日期：2026-05-22（初版）· 2026-05-25（补充 4 张 + polish 对齐）
