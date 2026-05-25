# 原型 vs 实现 — 浏览器截图对比

**日期：** 2026-05-25  
**环境：** `https://localhost/creator/`（Docker 全栈，视口 1280×900）  
**账号：** `screenshot-compare@local.dev`（测试数据经 API 种子）

## 方法

1. 使用 `agent-browser` 打开各页面并截图至 `impl-*.png`
2. 与高保真原型 `../prototypes/prototype-*.png` 做像素 diff（原型缩放至实现分辨率）
3. 输出 diff 热图与左右并排图至 `diffs/`

## 2026-05-25 第三轮 polish 后（登录 / 列表 / 详情）

| 页面 | 差异 % | 改动 |
|------|--------|------|
| 登录 | **6.57%**（→0） | 无变化（沿用 IconInput） |
| 项目列表 | **9.12%**（↑0.03） | 大卡片缩略图 `size=lg`、平台 emoji + ✓、CTA 左对齐、按 `updated_at` 排序、`main` 宽 960px |
| 项目详情 | **8.91%**（↓0.05） | 列表卡片 polish 连带 hero 缩略图尺寸一致 |

## 2026-05-25 第二轮 polish 后（登录 / 列表 / 详情）

| 页面 | 差异 % | 改动 |
|------|--------|------|
| 登录 | **6.57%**（↓2.5） | `IconInput` 邮箱/锁图标 |
| 项目列表 | **9.09%**（↓0.6） | 双列紧凑新建表单；「进行中」与「已完成」分栏 |
| 项目详情 | **8.96%**（↓0.2） | hero 缩略图 + 创建/更新/创作者/平台；步骤区 0/2000 字数 |

## 像素差异（首轮基准，其余页面未重跑）

| 页面 | 差异 % | 原型 | 实现 | Diff |
|------|--------|------|------|------|
| 完成态 | 5.58 | `prototype-project-completed.png` | `impl-project-completed.png` | `diffs/diff-project-completed.png` |
| 品牌档案 | 5.82 | `prototype-brand.png` | `impl-brand.png` | `diffs/diff-brand.png` |
| 长图文正文 | 6.37 | `prototype-long-article.png` | `impl-long-article.png` | `diffs/diff-long-article.png` |
| 项目空态 | 6.42 | `prototype-projects-empty.png` | `impl-projects-empty.png` | `diffs/diff-projects-empty.png` |
| 发布核对 | 6.96 | `prototype-publish-checklist.png` | `impl-publish-checklist.png` | `diffs/diff-publish-checklist.png` |

并排对比：`diffs/side-by-side-<name>.png`（左原型 / 右实现）

## 结构对齐（已达成）

- 暗色编辑室 + 琥珀强调色整体一致
- 登录左右分栏、注册链接、表单卡片
- 项目列表：新建表单 + 卡片列表 + 进度条与百分比
- 详情页：7 步 StepProgress、步骤编辑区、已确认步骤历史
- 品牌页：四字段 + 字数计数 + 保存说明
- 发布核对分组 checklist、完成态 banner

## 与原型仍可见差距（预期内 / 待 polish）

| 项 | 说明 |
|----|------|
| 项目卡片缩略图 | 实现为流水线渐变占位，原型为摄影图（R16 已知差异） |
| 列表测试数据 | 对比账号可能含多条进行中项目；原型为单卡片构图 |
| ~~登录输入框图标~~ | **已补** Mail/Lock 图标 |
| ~~详情 hero 信息密度~~ | **已补** 创建/更新/创作者/平台（无 ETA 后端字段） |
| ~~列表卡片尺寸/平台 pill~~ | **已补** 大缩略图、emoji、选中 ✓、CTA 左对齐 |

## 如何复现

```bash
# 需 Docker 栈运行中
agent-browser set viewport 1280 900
agent-browser open https://localhost/creator/login
agent-browser screenshot creator/docs/screenshot-comparison/impl-login.png

# 像素 diff（需 pillow）
uv run python scripts/compare_creator_screenshots.py   # 若后续提取脚本；当前见本目录生成物
```

## 结论

**组件级对齐基本达标**。第三轮 polish 后详情页 diff 略降至 **8.91%**；列表页主要剩余差距仍来自占位缩略图与测试账号多项目数据（单卡片原型 vs 多条种子项目），像素 diff 基本持平 **~9.1%**。Docker 部署需 `make creator-build` 或重建 `proxy` 镜像后才能在 `https://localhost/creator/` 看到最新 UI。
