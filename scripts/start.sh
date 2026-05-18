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
      echo "  postgres, redis, proxy, api (with migrations), celery-worker, celery-beat"
      echo ""
      echo "  SCALE_API=2 bash scripts/start.sh -d   # two API replicas for zero-downtime deploys"
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

if [ ! -f docker/certs/cert.pem ] || [ ! -f docker/certs/key.pem ]; then
  echo "Generating local TLS certs (docker/certs/)..."
  bash scripts/gen_dev_certs.sh
fi

SCALE_API="${SCALE_API:-1}"

COMPOSE_ARGS=(up --build --scale "api=${SCALE_API}" "${EXTRA_ARGS[@]}")
if $DETACHED; then
  COMPOSE_ARGS+=(-d)
fi

echo "Starting full stack (api replicas: ${SCALE_API})..."
docker compose "${COMPOSE_ARGS[@]}"

if $DETACHED; then
  echo ""
  echo "Waiting for API..."
  for _ in $(seq 1 30); do
    if curl -k -sf https://localhost/health >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
  echo ""
  docker compose ps
  echo ""
  echo "Full stack is up (local self-signed TLS):"
  echo "  API docs:  https://localhost/docs"
  echo "  Health:    https://localhost/health"
  echo "  Ready:     https://localhost/ready"
  echo "  Metrics:   https://localhost/metrics"
  echo "  HTTP :8000 redirects to HTTPS. Browser warnings are expected until you trust the cert."
  echo ""
  echo "Logs:  docker compose logs -f"
  echo "Stop:  docker compose down"
fi
