#!/usr/bin/env bash
# One command: start full stack (postgres, redis, api, celery-worker)
set -euo pipefail

cd "$(dirname "$0")/.."

DETACHED=false
EXTRA_ARGS=()

for arg in "$@"; do
  case "$arg" in
    -d | --detach)
      DETACHED=true
      ;;
    -h | --help)
      echo "Usage: bash scripts/start.sh [-d|--detach]"
      echo ""
      echo "Starts the full stack via Docker Compose:"
      echo "  postgres, redis, api (with migrations), celery-worker"
      echo ""
      echo "Options:"
      echo "  -d, --detach   Run in background"
      echo "  Other args are passed to 'docker compose up' (e.g. --build)"
      exit 0
      ;;
    *)
      EXTRA_ARGS+=("$arg")
      ;;
  esac
done

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker is not running. Start Docker Desktop and retry."
  exit 1
fi

COMPOSE_ARGS=(up --build "${EXTRA_ARGS[@]}")
if $DETACHED; then
  COMPOSE_ARGS+=(-d)
fi

echo "Starting full stack..."
docker compose "${COMPOSE_ARGS[@]}"

if $DETACHED; then
  echo ""
  echo "Waiting for API..."
  for _ in $(seq 1 30); do
    if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
  echo ""
  docker compose ps
  echo ""
  echo "Full stack is up:"
  echo "  API docs:  http://localhost:8000/docs"
  echo "  Health:    http://localhost:8000/health"
  echo "  Ready:     http://localhost:8000/ready"
  echo "  Metrics:   http://localhost:8000/metrics"
  echo ""
  echo "Logs:  docker compose logs -f"
  echo "Stop:  docker compose down"
fi
