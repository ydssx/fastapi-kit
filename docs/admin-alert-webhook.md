# Admin 告警 Webhook 对接说明

fastapi-kit 向配置的 URL 发送 **POST**，`Content-Type: application/json`。Body 为通用 JSON，字段如下：

| 字段 | 说明 |
|------|------|
| `event` | 事件类型，如 `ready_failed`、`beat_missing`、`test` |
| `environment` | `dev` / `prod` / `test` |
| `summary` | 人类可读摘要 |
| `timestamp` | ISO 8601 UTC 时间 |
| `details` | 可选对象，含额外上下文 |

若配置了 `webhook_secret`，请求头包含：

```http
X-Alert-Signature: sha256=<hmac-sha256-hex>
```

签名为 HMAC-SHA256(secret, raw_json_body)。

## Slack Incoming Webhook

在 Slack 应用中创建 Incoming Webhook 后，用中间层将上述 JSON 转为 Slack 格式，或在本仓库外使用小型转发服务。最小映射示例（转发服务伪代码）：

```json
{
  "text": "[fastapi-kit] {{summary}} ({{event}}) env={{environment}}"
}
```

## 钉钉自定义机器人

钉钉需 `msgtype` 包装。转发示例：

```json
{
  "msgtype": "text",
  "text": {
    "content": "[fastapi-kit] {{summary}}\n事件: {{event}}\n环境: {{environment}}"
  }
}
```

## 企业微信

与企业微信机器人文档类似，使用 `text` 类型消息，将 `summary` 与 `event` 拼入 `content` 字段。

## 测试

在管理后台 **告警** 页保存 URL 后点击 **测试发送**，应收到 `event: "test"` 的消息。发送记录可在同页查看（仅元数据，不含响应体）。
