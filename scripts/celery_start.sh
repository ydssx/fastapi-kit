#!/bin/bash

# 等待Redis就绪
echo "Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 0.1
done
echo "Redis is ready!"

# 启动Celery Worker
echo "Starting Celery worker..."
celery -A app.core.celery_app worker --loglevel=info
