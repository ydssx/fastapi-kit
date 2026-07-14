# 创作者工作台验证期手册

用于招募 5–10 名多平台创作者，验证 [需求文档](brainstorms/2026-05-22-creator-ai-workflow-hub-requirements.md) 中的成功标准。

## 入口

- Docker 全栈：`make up` → https://localhost/creator/
- 本机开发：`make dev-init` + `make dev` + `make creator-dev` → http://localhost:5174/creator/

## 成功指标（2 周）

| 指标 | 目标 |
|------|------|
| 完成至少 1 条端到端流水线 | 每名被访者 |
| 主观「少切换工具」或愿意每周打开 ≥2 次 | ≥50% 被访者 |
| 明确愿付费或参与付费内测 | ≥2 人 |

## 访谈提纲（30 分钟）

1. 你现在多平台发文用哪些工具？痛点在哪一步？
2. 走查一条短视频或长图文流水线，哪一步最有价值？哪一步多余？
3. 品牌档案是否有用？AI 建议质量如何（需配置 `LLM_API_KEY`）？
4. 免费额度（2 完整项目/月、50 次 AI）是否合理？
5. 是否愿意为此付订阅？心理价位？

## 运营命令

```bash
# 提升 Pro 额度（20 项目 / 500 AI，默认 10× 免费档）
uv run python scripts/promote_creator_pro.py --email creator@example.com

# Admin 查看埋点汇总
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://localhost/api/v1/admin/creator-metrics/summary
```

## 密码问题兜底

- **已登录改密**：创作者工作台 → 顶栏进入「账号设置」，需输入当前密码。
- **忘记密码（邮件）**：登录页「忘记密码」；需配置 `SMTP_*` 与 `APP_PUBLIC_URL`（见 `.env.example`）。
- **SMTP 未配置 / 邮件未收到**：由运营在 Admin 用户详情执行「重置密码」，将临时密码私下发给被访者；勿在 C 端展示无效重置链接。
