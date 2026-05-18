# fastapi-kit

Production-grade FastAPI backend template with async PostgreSQL, JWT auth, Redis, Celery, structured logging, Prometheus metrics, and Docker Compose.

## Features

- FastAPI + Uvicorn (ASGI lifespan)
- PostgreSQL + SQLAlchemy 2.0 async + Alembic migrations
- JWT authentication (register, login, refresh, `/me`)
- Redis cache utilities and per-IP rate limiting
- Celery background tasks and Beat scheduled jobs (heartbeat, Redis ping, nightly maintenance)
- structlog JSON logging with `X-Request-ID`
- Prometheus metrics at `/metrics`
- Health checks: `/health`, `/ready`
- Unified API response envelope and global exception handlers
- Docker Compose stack (API, Postgres, Redis, Celery worker, Celery Beat)
- GitHub Actions CI (ruff, mypy, pytest)

## Quick start

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (local dev only)
- Docker Desktop

### One command — full stack (recommended)

Starts **Postgres, Redis, API** (with migrations), **Celery worker**, and **Celery Beat**:

```bash
bash scripts/start.sh -d
```

Windows PowerShell:

```powershell
.\scripts\start.ps1 -d
```

Equivalent:

```bash
docker compose up --build -d
```

Then open http://localhost:8000/docs

Stop the stack:

```bash
bash scripts/stop.sh
# or: docker compose down
```

Follow logs: `docker compose logs -f`

> If port `8000` is already used by a local `uvicorn`, stop it first or change the port mapping in `docker-compose.yml`.

### Local development (hybrid: Docker DB + local API)

Only starts Postgres and Redis in Docker; run API on the host with hot reload:

```bash
bash scripts/init_dev.sh
uv run uvicorn app.main:app --reload
```

Celery (optional, separate terminals):

```bash
uv run celery -A app.tasks.celery_app worker -l info
uv run celery -A app.tasks.celery_app beat -l info
```

Scheduled tasks live in `app/tasks/scheduled.py`; intervals are configured in `app/tasks/celery_app.py` (`beat_schedule`). Run **one** Beat instance in production.

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| GET | `/ready` | Readiness (DB + Redis) |
| GET | `/metrics` | Prometheus metrics |
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Current user (Bearer) |

## Project layout

```
app/
  api/          # Routes and dependencies
  core/         # Config, security, logging, exceptions
  db/           # Async SQLAlchemy session
  models/       # ORM models
  repositories/ # Data access
  services/     # Business logic
  cache/        # Redis client and helpers
  tasks/        # Celery app and tasks
  middleware/   # Request ID, rate limiting
tests/          # pytest + testcontainers
```

## Environment variables

See [.env.example](.env.example) for all settings.

## Testing

```bash
uv run pytest -v
```

Tests use testcontainers for PostgreSQL and Redis (requires Docker).

If Docker is not running locally, you can point tests at existing services:

```bash
export TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/fastapi_kit
export TEST_REDIS_URL=redis://localhost:6379/0
uv run pytest -v
```

## License

MIT
