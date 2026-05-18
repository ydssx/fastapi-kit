#!/usr/bin/env bash
# Rolling replace API containers one at a time (zero-downtime when SCALE_API >= 2).
set -euo pipefail

cd "$(dirname "$0")/.."

SCALE_API="${SCALE_API:-2}"
STOP_TIMEOUT="${STOP_TIMEOUT:-35}"

if [ "${SCALE_API}" -lt 2 ]; then
  echo "SCALE_API must be >= 2 for zero-downtime rolling updates (current: ${SCALE_API})."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker is not running."
  exit 1
fi

count_healthy_api() {
  docker compose ps api --format '{{.Health}}' 2>/dev/null | grep -c '^healthy$' || true
}

wait_min_healthy_api() {
  local min=$1
  local attempt count
  for attempt in $(seq 1 60); do
    count=$(count_healthy_api)
    if [ "${count}" -ge "${min}" ]; then
      return 0
    fi
    sleep 2
  done
  echo "Error: expected >= ${min} healthy api container(s), got ${count}."
  return 1
}

wait_proxy_healthy() {
  local attempt
  for attempt in $(seq 1 45); do
    if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "Error: proxy/API health check failed at http://localhost:8000/health"
  return 1
}

wait_api_ready() {
  wait_min_healthy_api "${SCALE_API}"
  wait_proxy_healthy
}

echo "Ensuring stack is up with ${SCALE_API} API replica(s)..."
docker compose up -d --build --scale "api=${SCALE_API}"
wait_api_ready

mapfile -t containers < <(docker compose ps -q api)
if [ "${#containers[@]}" -lt 2 ]; then
  echo "Error: expected at least 2 api containers, found ${#containers[@]}."
  exit 1
fi

for cid in "${containers[@]}"; do
  echo ""
  echo "Replacing API container ${cid}..."
  wait_min_healthy_api "${SCALE_API}"
  docker stop -t "${STOP_TIMEOUT}" "${cid}"
  docker rm "${cid}"
  # At least one other replica should still be serving while the new one starts.
  wait_min_healthy_api $((SCALE_API - 1)) || wait_min_healthy_api 1
  docker compose up -d --no-deps --scale "api=${SCALE_API}" api
  wait_api_ready
  echo "Container ${cid} replaced; traffic still served via proxy."
done

echo ""
echo "Rolling update complete (${SCALE_API} API replica(s))."
