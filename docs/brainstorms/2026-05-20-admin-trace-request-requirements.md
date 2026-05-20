---
date: 2026-05-20
topic: admin-trace-request
---

# 管理后台：排障串联（request_id 深链与审计关联）

## Summary

在现有日志检索与审计能力之上，通过 URL 深链与审计记录持久化 `request_id`，使管理员能在日志、审计与用户详情之间一键跳转，完成「谁做了什么 → 当时请求日志是什么」的串联；告警自动关联、历史审计回填与统一调查页不在本期。

---

## Problem Frame

三期之后，管理员已能在后台按 `request_id` 查日志、按 action 查审计，但两类摩擦仍在：一是日志页筛选结果无法通过 URL 分享或书签，切页后需重新输入 `request_id` 与时间范围；二是审计记录未保存发起该次管理操作的 `request_id`，无法从一次 `user.update` 等操作反查对应请求日志，操作者仅以 UUID 片段展示且缺少直达用户详情的入口。排障时仍依赖手动复制粘贴与记忆时间窗口。

---

## Actors

- A1. **管理员（admin）**：在日志、审计、用户详情之间串联排障。
- A2. **运维/开发者**：与同事分享带 `request_id` 的日志链接，协作定位问题。

---

## Key Flows

- F1. **从审计追到请求日志**
  - **Trigger：** 怀疑某次管理操作引发异常，或需确认操作时的 API 行为。
  - **Actors：** A1
  - **Steps：** 打开审计日志 → 查看某条记录详情 → 点击「查日志」→ 日志页自动按 `request_id` 与时间范围查询 → 查看结构化日志行。
  - **Outcome：** 在 Loki 保留窗口内看到该次管理请求对应的日志，无需手动复制 ID。
  - **Covered by：** R6, R7, R8, R1, R2

- F2. **分享日志查询链接**
  - **Trigger：** 已定位某 `request_id`，需同事协助分析。
  - **Actors：** A1, A2
  - **Steps：** 在日志页完成查询 → 复制当前 URL → 同事打开链接 → 页面自动恢复相同筛选并展示结果。
  - **Outcome：** 协作排障不依赖截图或口头复述筛选条件。
  - **Covered by：** R1, R2, R3

- F3. **从审计到操作者用户详情**
  - **Trigger：** 需确认是谁执行了某次变更。
  - **Actors：** A1
  - **Steps：** 审计列表或详情 → 点击操作者 → 进入用户详情 → 查看该用户近期审计。
  - **Outcome：** 无需在用户列表中搜索 UUID。
  - **Covered by：** R4

---

## Requirements

**前端深链与页面跳转**
- R1. 日志页须读取 URL 查询参数（至少 `request_id`；可选 `since`、`until`、`level`、`q`），挂载后自动填入筛选并触发查询。
- R2. 日志查询成功后，URL 须与当前**已提交**的筛选条件同步，使刷新与分享保持同一查询状态。
- R3. 日志列表与详情中的 `request_id` 须支持一键复制。
- R4. 审计列表与详情中的 `actor_id` 须可点击，跳转至对应用户详情页。
- R5. 日志详情中若存在可识别的用户标识字段（字段命名留给 planning），须提供跳转至该用户详情的入口。

**审计 request_id 持久化**
- R6. 所有经 admin API 写入的审计记录须持久化发起该请求的 `request_id`（与 HTTP 请求 ID / 结构化日志上下文一致）。
- R7. 审计 API 响应与 admin UI 须展示 `request_id`；历史记录无该字段时显示「—」。
- R8. 审计详情须提供「查日志」操作，跳转日志页并预填 `request_id` 与合理默认时间范围（围绕操作时间，具体窗口留给 planning）。
- R9. （可选）审计列表支持按 `request_id` 筛选。

---

## Acceptance Examples

- **Covers: R6, R7, R8, R1** — 管理员修改用户角色后，打开该条审计详情可见 `request_id`；点击「查日志」→ 日志页自动查询并返回 ≥1 条匹配行（Loki 已启用且在保留窗口内）。
- **Covers: R2, R1** — 管理员在日志页按某 `request_id` 查询后复制 URL；同事在同一浏览器会话或新标签打开 → 筛选条件与结果一致。
- **Covers: R4** — 审计列表中点击某条记录的 `actor_id` → 进入对应用户详情页，邮箱与角色正确展示。
- **Covers: R7** — 迁移前产生的历史审计记录打开详情 → `request_id` 显示「—」，「查日志」不可用或明确提示无关联 ID（行为在 planning 定一种一致方案）。
- **Covers: R8, R12（沿用三期）** — 未启用 Loki profile 时点击「查日志」→ 仍跳转日志页，由现有日志不可用说明文案接管，不导致应用错误。

---

## Success Criteria

- 在 Loki 已启用的部署中，管理员能在 **1 分钟内**从一条**新产生**的审计记录到达对应请求日志。
- 带 `request_id` 的日志页 URL 分享给同事后，打开即呈现相同筛选结果。
- 历史审计无 `request_id` 的限制在 UI 内明确可见，不误导用户以为数据缺失是故障。
- `ce-plan` 可直接从本文档映射实施单元，无需再发明产品行为或成功标准。

---

## Scope Boundaries

**In scope（本期）**
- R1–R9 对应的产品行为与 admin UI/API 支撑（实现方式留给 planning）。
- 分两步交付：前端深链可独立先行；审计 `request_id` 紧随其后。

**Deferred for later**
- 告警发送记录 → 日志的自动关联（健康告警无 per-request `request_id`）。
- 历史审计 `request_id` 回填。
- 统一「调查」聚合页（粘贴 ID 一次展示日志 + 审计 + 用户）。
- 配置只读快照、仪表盘趋势等同路线其他候选。

**Outside this product's identity**
- 完整 APM、分布式追踪 UI、替代 Loki 的日志平台。

---

## Key Decisions

- MVP 采用**前端深链 + 审计写入 request_id** 组合，不并行开聚合调查页。
- 历史审计无 `request_id` 为已知限制，不做 backfill。
- 告警页不在本期做自动跳日志；若需时间关联，由人工对时间窗口处理。
- 交付顺序：前端深链可先合并；审计字段依赖数据迁移，作为第二步。

---

## Dependencies / Assumptions

- 继续依赖三期 Loki 可选 profile 与现有 `request_id` 中间件（结构化日志已绑定 `request_id`）。
- 假设主要操作者为受信任小团队；深链 URL 含 `request_id` 仅 admin 登录后可访问。
- 日志中用户标识字段是否存在、命名是否统一，需在 planning 阶段对照现有 structlog 字段确认；若不存在则 R5 降级为不做。

---

## Outstanding Questions

### Resolve Before Planning

（无——brainstorm 已确认方案 1+2 与 scope。）

### Deferred to Planning

- [Affects R8][Technical] 「查日志」默认时间窗口（如操作时间 ±15 分钟 vs ±1 小时）及是否包含 `since`/`until` 写入 URL。
- [Affects R5][Needs research] 日志 JSON 中用户标识字段名与覆盖率；若无稳定字段则 R5 标记为 out。
- [Affects R9][User decision] 是否在 v1 做审计按 `request_id` 筛选，或仅详情展示 + 跳日志。
- [Affects R7][Technical] 历史审计无 `request_id` 时「查日志」按钮隐藏 vs 禁用并 tooltip 说明。
