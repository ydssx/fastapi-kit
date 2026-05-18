# Repository Guidelines

## 项目结构与模块组织

应用代码位于 `app/`：

- `app/api/` 和 `app/api/v1/`：路由注册、请求校验、依赖注入。
- `app/services/`：业务逻辑。
- `app/repositories/`：异步 SQLAlchemy 数据访问。
- `app/models/`：ORM 模型。
- `app/schemas/`：Pydantic 请求与响应模型。
- `app/core/`：配置、安全、日志、异常。
- `app/cache/`、`app/tasks/`、`app/middleware/`：Redis、Celery 与 HTTP 中间件。

迁移文件在 `alembic/`。测试在 `tests/`，API 测试放在 `tests/api/`。脚本在 `scripts/`，Docker 相关文件在仓库根目录和 `docker/`。`docs/solutions/` 按类别归档过往方案与模式（bugs、架构决策等），YAML frontmatter 含 `module`、`tags`、`problem_type`；在实现或排查已记录领域时可供检索。

## 构建、测试与开发命令

- `uv sync --all-extras`：安装全部依赖。
- `bash scripts/start.sh -d` 或 `.\scripts\start.ps1 -d`：启动完整 Docker 栈（`postgres`、`redis`、`migrate` 一次性迁移、`proxy`（Caddy）、`api`、`celery-worker`、`celery-beat`）。对外入口为 **https://localhost**（本地自签证书，首次由 `scripts/gen_dev_certs.sh` 生成；`http://localhost:8000` 会 301 到 HTTPS）。浏览器会提示不受信任，属正常现象。
- `bash scripts/gen_dev_certs.sh` 或 `make certs`：单独生成本地 TLS 证书（`docker/certs/`，已 gitignore）。
- `SCALE_API=2 bash scripts/start.sh -d` 或 `make up-ha`：启动 **2 个 API 副本**，用于零停机滚动发布。
- `bash scripts/rolling_update.sh` 或 `make rolling-update`：在 `SCALE_API>=2` 时逐个替换 API 容器（需先 `up-ha`）。
- `make` / `Makefile`：封装 `dev`、`up`、`up-ha`、`rolling-update`、`check` 等常用目标。
- `bash scripts/init_dev.sh`：仅启动 PostgreSQL 和 Redis，供本机 API 开发使用。
- `uv run uvicorn app.main:app --reload`：本机热重载运行 API。
- `uv run celery -A app.tasks.celery_app worker -l info`：启动 Celery worker。
- `uv run celery -A app.tasks.celery_app beat -l info`：启动 Celery Beat（定时调度，仅单实例）。
- `uv run alembic upgrade head`：执行数据库迁移。
- `uv run ruff check .`、`uv run mypy app`、`uv run pytest -v`：运行 lint、类型检查和测试。

## 编码风格与命名约定

目标 Python 版本为 3.11。Ruff 负责导入和常见规则检查，行宽 100。Mypy 对 `app/` 使用 strict 模式。使用 4 空格缩进、带类型标注的异步函数，并在 API 边界使用明确的 Pydantic schema。

保持分层架构：router 不写 SQL，也不绕过 service/repository。配置统一通过 `app.core.config.Settings` 和 `get_settings()` 读取。API 响应使用 `ApiResponse` 信封，业务错误使用 `AppException`。

日志统一使用 `app.core.logging`：`setup_logging()` 在 API（`create_app`）、Celery worker/beat、Alembic 入口初始化；业务代码用 `get_logger(__name__)` 打结构化 JSON，不要直接使用 `print` 或未配置的 `logging`。

## 测试指南

测试使用 `pytest`、`pytest-asyncio`、`httpx` 和 testcontainers，并依赖 PostgreSQL 与 Redis。测试文件命名为 `test_*.py`，API 覆盖放在 `tests/api/`。如果本机不能使用 Docker，可先设置 `TEST_DATABASE_URL` 和 `TEST_REDIS_URL` 指向已有服务，再运行 `uv run pytest -v`。

## 提交与 Pull Request 指南

近期提交使用 `feat:`、`fix:`、`docs:` 等 conventional prefix。提交应聚焦单一变更，并描述行为影响。PR 应包含简短摘要、相关 issue、迁移说明、环境变量变化，以及 `ruff`、`mypy`、`pytest` 的运行结果。

## 安全与配置提示

不要提交 `.env` 或真实密钥。使用 `.env.example` 记录配置项。生产环境下默认 `JWT_SECRET` 会被拒绝。写库路由如需调度 Celery，应确保数据库提交完成后再调用 `.delay()`；适合时使用 `BackgroundTasks`。

Docker Compose 中 `migrate` 服务在 API 启动前执行 `alembic upgrade head`（多副本不会并行迁移）。经 Caddy 暴露 API 时，在 `api` 服务上设置 `TRUST_PROXY_HEADERS=true`，限流才按真实客户端 IP 计数；本机直连 uvicorn 时保持默认 `false`。
