---
date: 2026-05-18
topic: admin-phase2-ops-and-governance
---

# 管理后台二期：运维可见性与治理增强

## Summary

在现有 admin 登录、用户管理、仪表盘、Celery 概览与审计日志基础上，增强值班可见性（系统状态、任务调度）、审计可用性、管理员误操作防护，以及单用户运维视图，使 fastapi-kit 管理后台适合日常自助运维而非仅演示。

---

## Problem Frame

当前管理后台已能完成基本的用户启停与角色调整，并展示粗略的健康与 Celery 状态，但运维同学（或模板使用者）在排障时仍需切换 Docker 日志、`/docs`、Flower profile 或命令行，才能回答「服务是否完整就绪」「Beat 是否在跑」「谁改了什么」「会不会误删最后一个管理员」等问题。审计日志缺少筛选与导出，用户管理停留在表格级操作，无法快速处理单个账号的个案。这些缺口增加了值班与交付演示时的摩擦。

---

## Actors

- A1. **管理员（admin）**：登录后台执行用户治理、查看系统状态、处理 Celery 与审计信息。
- A2. **运维/开发者**：同一角色，但更关注健康检查、副本、迁移版本、任务与日志。

---

## Key Flows

- F1. **值班巡检**
  - **Trigger：** 部署后或告警后打开仪表盘。
  - **Actors：** A2
  - **Steps：** 登录 → 查看增强后的系统状态卡片 → 必要时进入 Celery 页查看 Beat/失败任务 → 必要时查审计或用户详情。
  - **Outcome：** 无需离开后台即可判断栈是否健康、任务是否调度、近期是否有人为变更。
  - **Covered by：** R1, R4

- F2. **用户个案处理**
  - **Trigger：** 需要处理某个账号的封禁、角色或密码问题。
  - **Actors：** A1
  - **Steps：** 用户列表 → 打开用户详情 → 查看关联审计 → 执行允许的操作（启停、改角色、重置密码等，依 R5 决策）。
  - **Outcome：** 操作可追溯，且不会破坏系统仅剩的管理员能力。
  - **Covered by：** R3, R5, R2

- F3. **事后追溯**
  - **Trigger：** 怀疑配置或账号被误改。
  - **Actors：** A1, A2
  - **Steps：** 审计日志页按时间/action/操作者筛选 → 查看详情 → 可选导出。
  - **Outcome：** 能还原「谁、何时、对什么、改了什么」。
  - **Covered by：** R2

---

## Requirements

**系统状态（仪表盘）**
- R1. 仪表盘须展示除现有 DB/Redis 与用户计数外，至少包含：整体就绪状态（与 `/ready` 语义一致）、当前 API 副本数（若可检测）、数据库迁移版本是否为 head、Celery Beat 是否可达/最近心跳是否正常（表述以用户可理解为准，不要求暴露内部实现名）。
- R2. 当某项依赖不可用（如 Redis 错误、无 worker、Beat 无响应）时，须在对应状态上明确标示异常，并给出简短说明文案，而非仅显示空白或 generic 错误。

**审计日志**
- R3. 审计列表须支持按时间范围、action、操作者（actor）、资源类型筛选，并保持分页。
- R4. 单条审计记录须可查看完整 detail（结构化展示），包含 IP 与用户代理（若有）。
- R5. 须支持将当前筛选结果导出为 CSV（单次导出上限可配置或合理默认，避免拖垮浏览器）。

**管理员安全护栏**
- R6. 当系统中仅剩一名 active 的 admin 时，禁止将其降级为非 admin 或停用，并返回明确错误信息。
- R7. 当操作会导致 active admin 数量低于 1 时（例如停用另一名 admin 且自己是唯一剩余 admin 的场景已覆盖；需覆盖「停用其他 admin 导致零 active admin」的组合），须阻止并提示。
- R8. 对用户执行改角色、停用账号等敏感操作时，前端须二次确认；后端仍校验，不依赖仅前端确认。

**Celery 监控**
- R9. Celery 页须展示当前 Beat 调度项列表（任务名与调度描述/间隔，来自已配置 schedule，而非要求完整 Flower）。
- R10. 须展示近期失败或长时间未响应的任务信息（在 inspect/broker 可得的范围内）；无数据时显示明确空状态，而非 degraded 与 unavailable 混用不清。
- R11. Flower 集成列为可选：若启用 ops profile，后台可提供受控入口（新标签打开或链接），且须说明仅内网/开发用途；不强制 iframe 嵌入。

**用户详情**
- R12. 用户列表须能进入单用户详情视图，展示邮箱、角色、状态、注册时间及该用户相关的审计记录（最近 N 条）。
- R13. 用户详情须支持在详情内完成与列表相同的启停与改角色操作（受 R6–R8 约束）。
- R14. 须支持管理员发起「重置密码」流程；具体机制见 Outstanding Questions（邮件邀请 vs 临时密码展示）。

---

## Acceptance Examples

- **Covers: R6** — 系统中只有 `admin@a.com` 一名 active admin；该用户尝试将自己角色改为 `user` → 操作被拒绝，提示不可移除最后一名管理员权限。
- **Covers: R7** — 系统有 admin A、admin B；A 停用 B 后若将导致 active admin 为 0（极端数据状态）→ 拒绝；仅两名 admin 时 A 停用 B 后仍剩 A 一名 active admin → 允许。
- **Covers: R2** — Redis 宕机时仪表盘 Redis 状态为 error，并显示「Redis 不可用」类说明，其他仍可用模块继续展示。
- **Covers: R5** — 筛选 `action=user.update` 后导出 CSV，文件包含列：时间、action、操作者、资源、IP，且行数与当前筛选一致（在导出上限内）。
- **Covers: R10** — 无 Celery worker 时页面状态为 unavailable，文案说明需启动 worker，不显示为 inspect 超时类的 degraded（除非 ping 成功而 inspect 失败）。

---

## Success Criteria

- 管理员在不使用 CLI 的情况下，能在 2 分钟内完成一次「部署后健康巡检」（仪表盘 + Celery）。
- 审计日志可按日期与 action 定位到一次用户变更，并可导出供归档。
- 无法通过 UI 将系统置于「零 active admin」状态。
- 单用户问题可在详情页完成查看与处理，无需在表格中盲目改字段。

---

## Scope Boundaries

**In scope（本期）**
- 上述 R1–R14 的产品行为与 admin UI/API 支撑（实现方式留给 planning）。
- 在现有 `role=admin` 模型上扩展，不引入多角色 RBAC。

**Deferred for later**
- 2FA、会话列表与强制下线、结构化应用日志检索（Loki）、配置热修改、告警 Webhook、RBAC 多角色、公开注册关闭策略。

**Outside this product's identity**
- 完整 BI 报表、低代码后台、替代 Flower 的全功能任务编排 UI、多租户。

---

## Key Decisions

- 本期优先「值班 + 治理」五件套，不并行开 RBAC 或告警平台。
- Celery 以「Beat 调度 + inspect 增强」为主，Flower 仅作可选外链入口。
- 安全护栏以后端校验为准，前端确认仅为体验层。

---

## Dependencies / Assumptions

- 继续依赖现有 Docker Compose 栈（API、Postgres、Redis、worker、beat、proxy）。
- 假设主要操作者为受信任的小团队管理员，而非面向公网的多租户运营。
- API 副本数、迁移版本、Beat 状态的部分信息可能仅在 Docker/compose 部署下可得；本机纯 uvicorn 开发模式可展示降级说明。

---

## Outstanding Questions

1. **R14 重置密码：** 采用「生成一次性临时密码并仅展示一次」还是「发送邮件重置链接」？模板默认无邮件服务时倾向前者。
2. **R5 导出上限：** 单次 CSV 最大行数默认 1000 还是 5000？
3. **R11 Flower：** 是否在二期就做 admin 内链接，还是文档说明即可？
