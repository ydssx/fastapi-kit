#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.prod}"
COMMAND="${1:-up}"
if (($# > 0)); then
  shift
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Copy .env.prod.example to .env.prod and replace examples."
  exit 1
fi

declare -A env_values=()
while IFS='=' read -r key value || [[ -n "$key" ]]; do
  key="${key%$'\r'}"
  value="${value%$'\r'}"
  [[ -z "$key" || "$key" == \#* ]] && continue
  key="${key#export }"
  key="${key//[[:space:]]/}"
  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi
  env_values["$key"]="$value"
done <"$ENV_FILE"

required=(
  DOMAIN ACME_EMAIL POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB DATABASE_URL
  REDIS_PASSWORD REDIS_URL JWT_SECRET CORS_ORIGINS APP_PUBLIC_URL
  OBJECT_STORAGE_ENDPOINT OBJECT_STORAGE_PUBLIC_ENDPOINT OBJECT_STORAGE_BUCKET
  OBJECT_STORAGE_ACCESS_KEY OBJECT_STORAGE_SECRET_KEY
)

errors=()
for key in "${required[@]}"; do
  value="${env_values[$key]:-}"
  if [[ -z "$value" ]]; then
    errors+=("$key is required")
  elif [[ "$value" == replace-with-* || "$value" == change-me* ]]; then
    errors+=("$key still uses an example value")
  fi
done

if [[ "${env_values[ENVIRONMENT]:-prod}" != "prod" ]]; then
  errors+=("ENVIRONMENT must be prod")
fi
if [[ "${env_values[DOMAIN]:-}" == *.example.com || "${env_values[DOMAIN]:-}" == "example.com" ]]; then
  errors+=("DOMAIN must not use example.com")
fi
if [[ "${env_values[ACME_EMAIL]:-}" == *@example.com ]]; then
  errors+=("ACME_EMAIL must not use example.com")
fi
jwt_secret="${env_values[JWT_SECRET]:-}"
if ((${#jwt_secret} < 32)); then
  errors+=("JWT_SECRET must contain at least 32 characters")
fi
if [[ -n "${env_values[OBJECT_STORAGE_PUBLIC_ENDPOINT]:-}" &&
  "${env_values[OBJECT_STORAGE_PUBLIC_ENDPOINT]}" != https://* ]]; then
  errors+=("OBJECT_STORAGE_PUBLIC_ENDPOINT must use https://")
fi

if ((${#errors[@]} > 0)); then
  printf 'Production configuration errors in %s:\n' "$ENV_FILE"
  printf '  - %s\n' "${errors[@]}"
  exit 1
fi

compose=(
  docker compose
  -f docker-compose.yml
  -f docker-compose.prod.yml
  --env-file "$ENV_FILE"
)

case "$COMMAND" in
  config)
    "${compose[@]}" config "$@"
    ;;
  up)
    if ! docker info >/dev/null 2>&1; then
      echo "Error: Docker is not running."
      exit 1
    fi
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
    "${compose[@]}" config --quiet
    "${compose[@]}" up --build --scale "api=${env_values[SCALE_API]:-1}" "$@"
    ;;
  down)
    "${compose[@]}" down "$@"
    ;;
  *)
    echo "Usage: ENV_FILE=.env.prod bash scripts/start_prod.sh {config|up|down} [args]"
    exit 2
    ;;
esac
