---
date: 2026-05-18
topic: admin-phase3-ops-runway
---

# 管理后台三期：运维跑道（告警与日志）

## Summary

在二期仪表盘、Celery/Beat 与审计能力之上，增加可配置的出站健康告警 Webhook，以及通过可选 Compose profile 提供的集中日志只读检索，使小团队在不打开 CLI 的情况下完成「异常发现 → 粗因定位」；配置快照只读与完整告警平台仍不在本期。

---

## Problem Frame

二期之后，管理员已能在后台完成健康巡检、审计追溯与 Celery 状态查看，但两类摩擦仍在：一是无人持续盯仪表盘时，Beat 停止或依赖故障无法及时触达值班渠道；二是排障仍常回到 `docker compose logs` 或本机终端，难以用 `request_id` 在管理界面内串联一次请求的上下文。二期需求文档已将「告警 Webhook」与「Loki 日志检索」标为 deferred，本期专门收口这两项，且不扩展为完整 APM 或配置中心。

---

## Actors

- A1. **管理员（admin）**：配置告警目标、查看告警发送记录、在启用日志 profile 后检索应用日志。
- A2. **运维/开发者**：接收第三方渠道告警、按 `request_id` 关联仪表盘/审计与日志行。

---

## Key Flows

- F1. **被动告警触达**
  - **Trigger：** 后台周期性或事件驱动检测到关键健康信号异常（与仪表盘语义一致）。
  - **Actors：** A2（接收方，经第三方渠道）
  - **Steps：** 系统判定异常 → 若已配置 Webhook 则 POST 结构化 payload → 记录发送元数据 → 异常恢复后可发送恢复类通知（若已启用恢复通知）。
  - **Outcome：** 值班人员在 5 分钟内（在检测周期与网络正常前提下）在 Slack/钉钉等渠道得知故障类型与简要说明。
  - **Covered by：** R1, R2, R3, R4, R5

- F2. **告警配置与验证**
  - **Trigger：** 首次部署或更换通知渠道。
  - **Actors：** A1
  - **Steps：** 登录 admin → 打开告警设置 → 填写 Webhook URL 与可选密钥 → 执行「测试发送」→ 查看最近发送记录列表。
  - **Outcome：** 确认渠道可达，且误配置能在 UI 内发现而非等到真实故障。
  - **Covered by：** R6, R7, R8

- F3. **按 request_id 查日志**
  - **Trigger：** 用户报障或审计/指标中出现某次 `request_id`。
  - **Actors：** A1, A2
  - **Steps：** 确认已启用日志 profile → 打开日志页 → 输入时间范围与 `request_id`（可选 level/关键字）→ 查看结果列表 → 打开单条详情。
  - **Outcome：** 在保留窗口内看到该请求相关的结构化日志行，无需 SSH 到容器。
  - **Covered by：** R9, R10, R11, R12

---

## Requirements

**健康告警（Webhook）**
- R1. 系统须支持管理员配置一条出站 Webhook URL；可选配置签名密钥或共享 secret，用于接收方校验（具体算法留给 planning，须文档说明）。
- R2. 当整体就绪语义失败（与 `/ready` 一致：数据库或 Redis 不可用）时，须触发告警；同一故障类型在持续异常期间须去重或节流，避免每分钟刷屏（间隔可配置或合理默认）。
- R3. 当 Celery Beat 心跳信号缺失或过期（与二期仪表盘 Beat 状态语义一致）时，须触发告警；恢复后须能发送恢复类通知（若 R4 启用恢复通知）。
- R4. 可选：当 Celery worker 数量为 0 且持续超过可配置时长时触发告警；默认行为与文档须说明未启用 worker 检测时仅依赖 R2/R3。
- R5. 告警 payload 须为通用 JSON（含事件类型、时间、环境名、人类可读摘要、可选详情对象），并附文档说明如何对接 Slack Incoming Webhook、钉钉/企业微信机器人等常见适配方式；不强制内置各厂商 SDK。
- R6. 管理员须能在后台查看最近告警**发送记录**（时间、事件类型、HTTP 状态、成功/失败），不存储完整第三方响应体或敏感 URL 查询参数。
- R7. 管理员须能发起「测试告警」，向当前配置的 Webhook 发送一条标明为测试的事件，且不依赖真实故障。
- R8. 未配置 Webhook URL 时，系统行为与现网一致：不发送、不报错阻塞 API 启动；后台设置页须明确提示「未启用告警」。

**集中日志（可选 profile）**
- R9. 须提供 Docker Compose **可选** profile（与现有 `ops` profile 协调或扩展），包含日志聚合与采集能力，使 API/worker 结构化日志可被查询；默认 `make up` / 标准启动**不强制**包含该 profile。
- R10. 管理员须能在后台按时间范围查询日志，并支持按 `request_id`、`level`、关键字筛选；结果分页，单次查询有合理行数上限。
- R11. 日志查询为**只读**：不提供删除、修改、全量导出下载；单条记录可查看完整 JSON 字段（在 UI 内结构化展示）。
- R12. 未启用日志 profile 或后端不可达时，日志页须显示明确说明（如何启动 profile、仅开发/内网用途），而非空白或误导性「无日志」。

**配置快照（本期不做）**
- （无 R-ID）运行时配置只读快照见 Scope Boundaries「Deferred for later」。

---

## Acceptance Examples

- **Covers: R2, R5** — Postgres 停止后，在节流窗口内 Webhook 收到一条 `ready_failed` 类事件，JSON 含 `environment` 与「数据库不可用」类摘要；Slack 适配文档说明如何将 payload 映射为 `text` 字段。
- **Covers: R3** — Beat 心跳键过期超过阈值 → 发送 `beat_missing`；Beat 恢复且心跳键更新 → 发送 `beat_recovered`（若启用恢复通知）。
- **Covers: R8** — `WEBHOOK_URL` 未配置：API 正常启动，设置页显示未启用，无后台任务因告警配置缺失而崩溃。
- **Covers: R7** — 管理员点击测试发送 → 记录列表新增成功行，第三方渠道收到带 `test` 标记的消息。
- **Covers: R6** — 发送失败（如 404）时记录列表显示失败与 HTTP 状态，不记录响应 body。
- **Covers: R10, R11** — 已知某 `request_id` 在保留窗口内 → 查询返回 ≥1 条匹配行；无删除按钮、无「导出全部」。
- **Covers: R12** — 未启动 Loki profile 时打开日志页 → 文案说明需 `docker compose --profile ...` 启动，不提供假数据。

---

## Success Criteria

- 在 Webhook 已配置且检测任务运行的部署中，Beat 停止或 DB 不可用后，**5 分钟内**第三方渠道收到至少一条可读的告警消息。
- 启用日志 profile 后，管理员能在 **3 分钟内**用 `request_id` 定位到对应结构化日志（保留窗口内）。
- 未配置 Webhook 时，零行为变化、零启动失败。
- `ce-plan` 可直接从本文档映射实施单元，无需再发明产品行为或成功标准。

---

## Scope Boundaries

**In scope（本期）**
- R1–R12 对应的产品行为、admin UI/API 支撑、可选 Compose profile 与文档（实现方式留给 planning）。
- 延续 `role=admin` 单角色模型；告警与日志 API 仅管理员可访问。

**Deferred for later**
- 运行时配置只读快照（二期 deferred「配置热改」的轻量替代）。
- 2FA、会话列表与强制下线、RBAC 多角色、公开注册策略。
- 配置热修改、完整 Alertmanager/Grafana 告警栈、告警升级与 on-call 排班。
- 邮件通道告警、短信告警。
- 日志全量导出、日志保留策略在 admin 内可视化配置（可先由 compose/运维文档约定）。

**Outside this product's identity**
- 多租户、BI 报表、低代码后台、替代 Flower 的全功能任务 UI。
- OAuth/SSO（属身份路线，可与本期并行但不在本文档范围）。

---

## Key Decisions

- 三期 MVP 以**告警 Webhook** 为主增量；**Loki 只读检索**同批交付但经 **可选 Compose profile** 启用，不抬高默认 `make up` 复杂度。
- 告警 payload 采用**通用 HTTP JSON** + 对接文档，不内置 Slack/钉钉专用 SDK。
- 告警发送记录仅存**元数据**（时间、类型、HTTP 状态、成功/失败），不存完整响应体。
- **配置快照只读**推迟到后续迭代，避免与 `.env` 文档重复且 scope 膨胀。
- 检测与去重逻辑以后台任务或 Beat 侧轻量轮询实现（具体归属 planning），须与二期仪表盘健康语义保持一致。

---

## Dependencies / Assumptions

- 继续依赖 Docker Compose 全栈（API、Postgres、Redis、worker、beat）及二期 Redis Beat 心跳键。
- 假设主要操作者为受信任小团队；Webhook URL 与 secret 由管理员自行保管，模板不代管第三方账号。
- 日志 profile 面向开发/内网排障；生产保留期与磁盘由运维在 compose 层配置，admin 仅查询。
- 本机纯 `uvicorn` 开发可无 Loki profile，日志页走 R12 降级说明。

---

## Outstanding Questions

### Resolve Before Planning

（无——synthesis 已确认：方案 1 + 方案 2，通用 JSON 告警，配置快照 deferred。）

### Deferred to Planning

- [Affects R2, R3][Technical] 健康检测周期、去重窗口、恢复通知默认开/关的默认值。
- [Affects R4][Technical] worker 数为 0 的检测是否默认启用及持续时长阈值。
- [Affects R9][Needs research] Loki + Promtail vs API 直推的采集方式与 compose 服务命名，与现有 `ops` profile（Flower）如何共存。
- [Affects R10][Technical] 日志查询 API 是代理 Loki HTTP 还是在 API 内封装查询语言；行数上限与超时。
- [Affects R1][Technical] Webhook 配置存环境变量、数据库表或二者组合（需支持 admin UI 修改时倾向 DB + 审计）。
