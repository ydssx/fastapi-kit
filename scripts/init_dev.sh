#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

uv sync --all-extras
docker compose up -d postgres redis

echo "Waiting for services..."
sleep 5

uv run alembic upgrade head
echo "Database migrated."
echo ""
echo "Infrastructure only (postgres + redis). To start API locally:"
echo "  uv run uvicorn app.main:app --reload"
echo "  uv run celery -A app.tasks.celery_app worker -l info"
echo "  uv run celery -A app.tasks.celery_app beat -l info"
echo ""
echo "Or start the full stack in Docker (one command):"
echo "  bash scripts/start.sh -d"
