# Repository Guidelines

## 项目结构

后端代码在 `app/`：`api/` 与 `api/v1/` 放路由、校验和依赖注入，`services/` 放业务逻辑，`repositories/` 放异步 SQLAlchemy 数据访问，`models/` 与 `schemas/` 分别放 ORM 与 Pydantic 模型，`core/` 放配置、安全、日志和异常，`db/` 放 session 与数据库基础设施，`cache/`、`tasks/`、`middleware/` 分别对应 Redis、Celery 和 HTTP 中间件。

迁移在 `alembic/`，测试在 `tests/`（API 测试放 `tests/api/`），脚本在 `scripts/`，Docker/Caddy 配置在仓库根目录和 `docker/`。`admin/` 是管理后台，`creator/` 是创作者工作台；各自的前端约定见 `admin/FRONTEND.md` 和 `creator/FRONTEND.md`。历史方案与排查记录在 `docs/solutions/`，领域词汇在 `CONCEPTS.md`。

## 常用命令

优先使用 `Makefile` 入口；需要排查脚本行为时再看 `scripts/`。

- `uv sync --all-extras` 或 `make install`：安装 Python 依赖；首次前端开发或锁文件变化后运行 `make frontend-install`。
- `make up`：启动完整 Docker 栈，包含 `postgres`、`redis`、`migrate`、`proxy`、`api`、`celery-worker`、`celery-beat`。入口为 `https://localhost`，管理后台为 `https://localhost/admin/`，创作者工作台为 `https://localhost/creator/`。
- `make up-ha` / `make rolling-update`：以 2 个 API 副本启动并滚动替换 API 容器。
- `make dev-init`：只启动 PostgreSQL 和 Redis，并执行迁移，供本机 API 热重载开发。
- `make dev`、`make worker`、`make beat`：分别运行本机 API、Celery worker、Celery Beat。
- `make down`、`make logs`、`make certs`、`make migrate`：停止、查看日志、生成本地 TLS 证书、执行迁移。
- `make check`：后端质量门禁，等同于 `ruff check`、`mypy app`、`pytest -v`。
- `make frontend-check`：前端质量门禁，依次 lint/build `admin` 与 `creator`（不重装依赖）。

## 前端工作流

`make up` 会在构建 `proxy` 镜像时同时构建 `admin` 与 `creator`，通常不需要先手动 build。管理后台本机热重载用 `make admin-dev`（`http://localhost:5173/admin/`），容器热重载用 `make admin-docker-dev`。创作者工作台本机热重载用 `make creator-dev`（`http://localhost:5174/creator/`）。单独安装依赖用 `make admin-install` 或 `make creator-install`；单独构建用 `make admin-build` 或 `make creator-build`；单独检查用 `make admin-check` 或 `make creator-check`。

管理 API 前缀是 `/api/v1/admin/*`，需要 Bearer token 且 `role=admin`；创建管理员用 `make create-admin EMAIL=... PASSWORD=...`。创作者 API 前缀是 `/api/v1/creator/*`，JWT 数据按用户隔离；验证期提升 Pro 用 `make promote-creator-pro EMAIL=...`。可选 ops profile 用 `docker compose --profile ops up -d` 启动 Flower、Loki、Promtail；日志查询需设置 `LOKI_URL=http://loki:3100`。

## 编码约束

目标 Python 版本是 3.11，Ruff 行宽 100，Mypy 对 `app/` 使用 strict 模式。API 边界使用明确的 Pydantic schema，异步函数要带类型标注。

保持分层：router 不写 SQL，不绕过 service/repository；配置通过 `app.core.config.Settings` 和 `get_settings()` 读取；响应使用 `ApiResponse` 信封，业务错误使用 `AppException`。日志统一走 `app.core.logging`，业务代码用 `get_logger(__name__)` 输出结构化 JSON，不要使用 `print` 或未配置的 `logging`。

写库路由如需调度 Celery，确保数据库提交完成后再调用 `.delay()`；适合请求内轻量异步收尾时可用 `BackgroundTasks`。

## 测试与验证

测试使用 `pytest`、`pytest-asyncio`、`httpx` 和 testcontainers，依赖 PostgreSQL 与 Redis。测试文件命名为 `test_*.py`。本机不能用 Docker 时，可设置 `TEST_DATABASE_URL` 和 `TEST_REDIS_URL` 指向已有服务，再运行 `uv run pytest -v`。

CI 目前只执行后端门禁：`uv sync --all-extras`、`uv run ruff check .`、`uv run mypy app`、`uv run pytest -v`。改动前端时本地补跑 `make frontend-check`，因为 GitHub Actions 尚未覆盖 Node 构建。

## 提交与安全

提交使用 `feat:`、`fix:`、`docs:` 等 conventional prefix，保持单一变更。PR 摘要应包含行为影响、相关 issue、迁移说明、环境变量变化，以及实际运行过的 `make check` / `make frontend-check` 结果。

不要提交 `.env` 或真实密钥；新增配置写入 `.env.example`。生产环境会拒绝默认 `JWT_SECRET`。Docker Compose 的 `migrate` 服务在 API 启动前执行 `alembic upgrade head`，多副本不会并行迁移。经 Caddy 暴露 API 时，`api` 服务设置 `TRUST_PROXY_HEADERS=true` 以便限流按真实客户端 IP 计数；本机直连 uvicorn 保持默认 `false`。

## Cursor Cloud

每个会话先启动 Docker：

```bash
sudo dockerd &>/tmp/dockerd.log &
sleep 3
```

若缺少 `.env`，先 `cp .env.example .env`。若 `docker/certs/cert.pem` 不存在，在 Cursor Cloud 中优先直接用 `openssl` 生成证书，避免 `scripts/gen_dev_certs.sh` 在 `sh` 下因 shell 选项失败。启动与验证：

```bash
sudo docker compose up --build -d
curl -k -s https://localhost/health
```

测试可复用已启动容器，避免 testcontainers 再拉起服务：

```bash
export TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/fastapi_kit"
export TEST_REDIS_URL="redis://localhost:6379/0"
uv run pytest -v
```

已知：`app/tasks/celery_app.py` 的 Celery signal decorators 可能触发 2 个既有 `untyped-decorator` mypy 报错；不要把它误判为本次改动引入，除非正在专门修类型问题。
