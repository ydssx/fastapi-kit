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

Then open https://localhost/docs (the local certificate is self-signed).

Stop the stack:

```bash
bash scripts/stop.sh
# or: docker compose down
```

Follow logs: `docker compose logs -f`

> If port `8000` is already used by a local `uvicorn`, stop it first or change the port mapping in `docker-compose.yml`.

### Production Compose entry

Production keeps the local `docker-compose.yml` as its base and applies
`docker-compose.prod.yml`:

```bash
cp .env.prod.example .env.prod
# Replace every example credential, domain, and URL in .env.prod.
make prod-config
make up-prod
```

`make down-prod` stops the production stack. The override enables Caddy ACME TLS,
publishes only `443`, keeps PostgreSQL/Redis/MinIO off host ports, and protects
Redis with AOF plus a named volume. Public `/metrics` returns 404; Prometheus
metrics remain available inside the Compose network at `http://api:8000/metrics`.

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
| GET | `/api/v1/admin/*` | Admin APIs (admin role + Bearer) |

## Admin dashboard

React SPA in `admin/` (login, users, dashboard, Celery overview, audit logs, alert webhooks, log search).

## Creator workspace (C-end)

React SPA in `creator/` — multi-platform content pipelines (short video / long article), brand profile, publish checklist, optional step AI (`LLM_API_KEY`). Served at **https://localhost/creator/** with `make up`; dev: `make creator-dev`.

```bash
# Create first admin
uv run python scripts/create_admin.py --email admin@local.dev --password 'your-secure-password'

# Full stack (admin SPA is built into the proxy image)
make up
# https://localhost/admin/

# Optional: Vite hot reload in Docker
docker compose --profile admin-dev up -d admin-dev
# http://localhost:5173/admin/

# Or Vite on the host
make admin-dev
```

Optional ops profile (Flower, Loki, Promtail — not exposed on public Caddy):

```bash
docker compose --profile ops up -d loki promtail flower
# Set LOKI_URL=http://loki:3100 on the API service for admin log search
```

Configure outbound health alerts in **Admin → 告警**, or seed `ALERT_WEBHOOK_URL`. See [docs/admin-alert-webhook.md](docs/admin-alert-webhook.md).

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
admin/          # React admin SPA (Vite)
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
