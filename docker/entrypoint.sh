#!/bin/sh
set -e

mkdir -p /app/logs
chown -R app:app /app/logs

alembic upgrade head
exec gosu app "$@"
