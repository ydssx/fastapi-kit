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

## 生成方式

实现截图（非 AI 生成 mock），由 `scripts/capture_creator_v2_prototypes.py` 产出：

```bash
# 终端 1：API
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000

# 终端 2：Creator 前端（记下实际端口，如 5176）
VITE_API_PROXY=http://127.0.0.1:8000 npm run dev --prefix creator

# 终端 3：截图
CREATOR_DEV_URL=http://localhost:5176/creator uv run python scripts/capture_creator_v2_prototypes.py
```

生成日期：2026-06-11（布局瘦身 + 工作台截图对齐）

## 布局说明（2026-06-11 更新）

- 向导页使用 **compact hero**（无缩略图/元数据块），步骤条 + 上下文芯片 **sticky**
- 目标平台选择仅在 **前两步** 显示
- 向导类截图脚本会 `scrollintoview #creator-step-workspace` 并对齐 AI 面板

对照 spec Success Criteria 五项勾选。
