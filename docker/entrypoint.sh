#!/bin/sh
set -e

mkdir -p /app/logs
chown -R app:app /app/logs
# Legacy default path may be root-owned from earlier runs.
rm -f /app/celerybeat-schedule /app/celerybeat-schedule.db 2>/dev/null || true

alembic upgrade head
exec gosu app "$@"
