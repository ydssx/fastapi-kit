# Repository Guidelines

## 项目结构与模块组织

应用代码位于 `app/`：

- `app/api/` 和 `app/api/v1/`：路由注册、请求校验、依赖注入。
- `app/services/`：业务逻辑。
- `app/repositories/`：异步 SQLAlchemy 数据访问。
- `app/models/`：ORM 模型。
- `app/schemas/`：Pydantic 请求与响应模型。
- `app/core/`：配置、安全、日志、异常。
- `app/db/`：异步 SQLAlchemy session 与数据库基础设施。
- `app/cache/`、`app/tasks/`、`app/middleware/`：Redis、Celery 与 HTTP 中间件。

迁移文件在 `alembic/`。测试在 `tests/`，API 测试放在 `tests/api/`。脚本在 `scripts/`，Docker 相关文件在仓库根目录和 `docker/`。`docs/solutions/` 按类别归档过往方案与模式（bugs、架构决策等），YAML frontmatter 含 `module`、`tags`、`problem_type`；在实现或排查已记录领域时可供检索。`CONCEPTS.md` 为共享领域词汇（实体、命名流程、状态概念），熟悉 creator/流水线等领域时可供查阅。

## 构建、测试与开发命令

- `uv sync --all-extras`：安装全部依赖。
- `bash scripts/start.sh -d` 或 `.\scripts\start.ps1 -d`：启动完整 Docker 栈（`postgres`、`redis`、`migrate` 一次性迁移、`proxy`（Caddy，内含构建好的 **admin** 静态资源）、`api`、`celery-worker`、`celery-beat`）。对外入口为 **https://localhost**（管理后台 **https://localhost/admin/**；访问 `/admin` 会自动 301 到 `/admin/`；本地自签证书，首次由 `scripts/gen_dev_certs.sh` 生成；`http://localhost:8000` 会 301 到 HTTPS）。浏览器会提示不受信任，属正常现象。
- `bash scripts/gen_dev_certs.sh` 或 `make certs`：单独生成本地 TLS 证书（`docker/certs/`，已 gitignore）。
- `SCALE_API=2 bash scripts/start.sh -d` 或 `make up-ha`：启动 **2 个 API 副本**，用于零停机滚动发布。
- `bash scripts/rolling_update.sh` 或 `make rolling-update`：在 `SCALE_API>=2` 时逐个替换 API 容器（需先 `up-ha`）。
- `make` / `Makefile`：封装 `dev`、`up`、`up-ha`、`rolling-update`、`check` 等常用目标。
- `bash scripts/init_dev.sh` 或 `make dev-init`：仅启动 PostgreSQL 和 Redis，供本机 API 开发使用。
- `bash scripts/stop.sh` 或 `make down`：停止 Docker 栈。
- `docker compose logs -f` 或 `make logs`：跟随查看 Compose 日志。
- `uv run uvicorn app.main:app --reload`：本机热重载运行 API。
- `uv run celery -A app.tasks.celery_app worker -l info`：启动 Celery worker。
- `uv run celery -A app.tasks.celery_app beat -l info`：启动 Celery Beat（定时调度，仅单实例）。
- `uv run alembic upgrade head`：执行数据库迁移。
- `uv run ruff check .`、`uv run ruff format .`、`uv run mypy app`、`uv run pytest -v`：运行 lint、格式化、类型检查和测试。

### 管理后台（`admin/`）

- 前端开发规范见 `admin/FRONTEND.md`（目录结构、设计 token、页面骨架、API 约定）。
- `make create-admin EMAIL=admin@local.dev PASSWORD=yourpassword` 或 `uv run python scripts/create_admin.py --email ... --password ...`：创建/提升管理员（`role=admin`）。
- **Docker 一体启动**：`make up` / `bash scripts/start.sh -d` 会在构建 `proxy` 镜像时自动 `npm run build` admin，无需先 `make admin-build`。
- `make admin-dev`：本机 Vite（`http://localhost:5173/admin/`），`/api` 代理到 `https://localhost`。
- `make admin-docker-dev` 或 `docker compose --profile admin-dev up -d admin-dev`：Vite 跑在容器内（改代码热重载，API 代理到 compose 里的 `proxy`）。
- `make admin-build`：仅在本机构建 `admin/dist/`（调试 Caddy 或不用 compose 构建 proxy 时可选）。
- 管理 API 前缀：`/api/v1/admin/*`（需 Bearer token 且 `role=admin`）。
- 可选 **ops profile**（Flower、Loki、Promtail）：`docker compose --profile ops up -d`（内网用途，不经 Caddy 公网暴露）。日志查询需在 API 设置 `LOKI_URL=http://loki:3100`；告警 Webhook 可在 admin **告警** 页配置，或通过 `ALERT_WEBHOOK_URL` 种子。对接说明见 `docs/admin-alert-webhook.md`。

### 创作者工作台（`creator/`）

- 前端规范见 `creator/FRONTEND.md`；C 端 API 前缀 `/api/v1/creator/*`（JWT，数据按用户隔离）。
- **Docker 一体启动**：`make up` 会在 proxy 镜像中同时构建 admin 与 creator；访问 **https://localhost/creator/**。
- `make creator-dev`：本机 Vite（`http://localhost:5174/creator/`），`/api` 代理到 `https://localhost`。
- `make creator-build`：仅本机构建 `creator/dist/`。
- `uv run python scripts/promote_creator_pro.py --email ...`：验证期手动提升 Pro 额度；埋点汇总 `GET /api/v1/admin/creator-metrics/summary`。
- 验证访谈见 `docs/creator-validation-playbook.md`；配置 `LLM_API_KEY` 后可用步骤 AI 建议。

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
