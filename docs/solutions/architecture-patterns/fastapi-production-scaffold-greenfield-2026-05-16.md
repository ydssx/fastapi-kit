---
title: Production FastAPI scaffold from greenfield (fastapi-kit)
date: 2026-05-16
category: architecture-patterns
module: fastapi-kit
problem_type: architecture_pattern
component: development_workflow
severity: high
applies_when:
  - "从空仓库搭建需要生产就绪基线的 FastAPI 服务"
  - "需要 Docker Compose 本地全栈（API + Postgres + Redis + Celery）"
  - "使用 uv + hatchling 构建 Docker 镜像"
  - "请求级 DB session 在依赖 teardown 时 commit"
symptoms:
  - "Docker 构建在 uv sync / hatchling 阶段失败，提示 README.md 不存在"
  - "只运行 init_dev.sh 后 API 无法访问"
  - "生产环境仍可使用默认 JWT_SECRET 启动"
  - "Redis 故障时限流被静默绕过"
  - "注册后立即发 Celery 任务，worker 偶发查不到用户"
root_cause: incomplete_setup
resolution_type: workflow_improvement
related_components:
  - authentication
  - database
  - background_job
  - testing_framework
  - tooling
  - documentation
tags:
  - fastapi
  - sqlalchemy-async
  - postgresql
  - jwt
  - redis
  - celery
  - docker-compose
  - uv
  - hatchling
  - rate-limit-fail-closed
  - background-tasks
---

# Production FastAPI scaffold from greenfield (fastapi-kit)

## Context

`fastapi-kit` 从空目录起步，目标是可本地一键启动、可容器化部署、可扩展的生产级后端模板。最终形态包括：

- **分层**：`api` → `service` → `repository` → SQLAlchemy 2 异步模型
- **能力**：JWT 注册/登录/刷新、`/me`、Redis 缓存与限流、Celery 示例任务、structlog、`/metrics`、Alembic、pytest + testcontainers、GitHub Actions
- **两种启动路径**：
  - `scripts/init_dev.sh`：仅 Docker 起 Postgres + Redis，本机 `uvicorn --reload`（热重载开发）
  - `scripts/start.sh -d` / `docker compose up --build -d`：全栈（API + worker + 依赖）

实施与 code review 阶段还修复了 Docker 构建、hatchling 打包、注册/Celery 时序、限流策略与生产密钥校验等问题。

## Guidance

### 目录与依赖

| 区域 | 约定 |
|------|------|
| 包管理 | `uv` + `pyproject.toml` + `uv.lock` |
| 配置 | `pydantic-settings`，`.env` / 环境变量 |
| 迁移 | Alembic 异步 `env.py`，与 `DATABASE_URL` 一致 |
| 测试 | testcontainers（Postgres + Redis）；无 Docker 时可设 `TEST_DATABASE_URL` / `TEST_REDIS_URL` |

### 启动脚本分工

| 脚本 | 作用 |
|------|------|
| `scripts/init_dev.sh` | `uv sync`、Docker 仅 `postgres`+`redis`、`alembic upgrade`；**不**启动 API |
| `scripts/start.sh -d` | 检查 Docker → `docker compose up --build -d` → 等待 `/health` |
| `scripts/stop.sh` | `docker compose down` |

### 生产加固（code review 落地）

1. **Docker + hatchling**：`readme = "README.md"` 时 builder 必须 `COPY README.md`；`.dockerignore` 可用 `*.md` + `!README.md`
2. **Celery 入队时机**：注册等写库路由用 `BackgroundTasks` 调用 `send_notification.delay`，不要在 service 内与 `get_db` commit 竞态
3. **限流 fail-closed**：Redis 异常返回 503（`50301`），不放行请求
4. **生产 JWT**：`ENVIRONMENT=prod` 且仍为默认 `JWT_SECRET` 时启动失败（`model_validator`）
5. **邮箱**：注册/登录统一 `email.lower()`，避免大小写重复账号
6. **`/me`**：已有 `CurrentUser` 时直接 `UserPublic.model_validate(current_user)`，避免重复查库

## Why This Matters

- **Hatchling 构建失败**与业务代码无关，却在 CI/CD 首跑就阻塞，浪费排查时间。
- **Celery 早于 commit**会在异步 worker 里产生「用户不存在」类偶发问题，难以复现。
- **init_dev 与全栈 Compose 混用**会导致「以为服务已起、实际只有数据库」的误解。
- **限流 fail-open**在 Redis 宕机时等于无限流，不符合生产 kit 的定位。
- **默认 JWT secret**一旦进入 prod，所有 token 可被伪造。

## When to Apply

- 新建 FastAPI 服务并计划 Docker + Celery + Redis。
- `pyproject.toml` 使用 hatchling 且声明 `readme`。
- 使用 `async def get_db()` + `yield` + 请求结束 `commit` 模式。
- 需要区分「本机热重载开发」与「Compose 全栈演示/集成验证」。

## Examples

### Docker：COPY README.md（hatchling）

**错误现象：**

```text
OSError: Readme file does not exist: README.md
```

**修复：**

```dockerfile
COPY pyproject.toml uv.lock README.md ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
RUN uv sync --frozen --no-dev
```

```gitignore
*.md
!README.md
```

### Celery：BackgroundTasks 在 commit 之后

`get_db` 在 handler 返回后的 teardown 中 `commit`：

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

注册路由（当前实现）：

```python
async def register(..., background_tasks: BackgroundTasks):
    result = await AuthService(db).register(payload)
    background_tasks.add_task(_queue_welcome_notification, str(result.user.id))
    return ApiResponse(data=result)
```

**避免：** 在 `AuthService.register` 内直接 `send_notification.delay(...)`。

### 限流：Redis 不可用 → 503

```python
except Exception:
    return JSONResponse(
        status_code=503,
        content=ApiResponse(code=50301, message="Rate limiting unavailable", data=None).model_dump(),
    )
```

### 生产 JWT 校验

```python
@model_validator(mode="after")
def reject_default_jwt_secret_in_production(self) -> "Settings":
    if self.environment == "prod" and self.jwt_secret == _DEFAULT_JWT_SECRET:
        raise ValueError("JWT_SECRET must be set to a strong unique value when ENVIRONMENT=prod")
    return self
```

### 全栈一键启动

```bash
bash scripts/start.sh -d
# 或
docker compose up --build -d
```

API 文档：http://localhost:8000/docs

## Related

- 项目 README：[README.md](../../../README.md)
- 环境变量：[.env.example](../../../.env.example)
- Code review 后加固提交：`33bf2eb`（`fix: harden auth, rate limiting, and test setup`）

## Related Issues

- 无 GitHub issue 关联（本地 greenfield 搭建）
