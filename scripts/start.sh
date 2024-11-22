#!/bin/bash

# 等待数据库就绪
echo "Waiting for database..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "Database is ready!"

# 等待Redis就绪
echo "Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 0.1
done
echo "Redis is ready!"

# 运行数据库迁移
echo "Running database migrations..."
alembic upgrade head

# 启动应用
echo "Starting FastAPI application..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
