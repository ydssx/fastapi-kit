.PHONY: help install dev test lint clean docker-build docker-up docker-down migrate

# 显示帮助信息
help:
	@echo "Available commands:"
	@echo "make install    - Install production dependencies"
	@echo "make dev       - Install development dependencies"
	@echo "make test      - Run tests"
	@echo "make lint      - Run code linting"
	@echo "make clean     - Clean up temporary files"
	@echo "make docker-build - Build Docker images"
	@echo "make docker-up - Start Docker containers"
	@echo "make docker-down - Stop Docker containers"
	@echo "make migrate   - Run database migrations"

# 安装生产依赖
install:
	pip install -r requirements.txt

# 安装开发依赖
dev:
	pip install -r requirements-dev.txt

# 运行测试
test:
	pytest tests/ --cov=app --cov-report=html

# 代码检查
lint:
	flake8 app/
	black app/ --check
	isort app/ --check-only
	mypy app/

# 格式化代码
format:
	black app/
	isort app/

# 清理临时文件
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type f -name ".coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name "*.egg" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name ".tox" -exec rm -rf {} +
	find . -type d -name "htmlcov" -exec rm -rf {} +
	find . -type d -name "build" -exec rm -rf {} +
	find . -type d -name "dist" -exec rm -rf {} +

# Docker 相关命令
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

# 数据库迁移
migrate:
	alembic upgrade head

# 创建新的数据库迁移
migrate-create:
	alembic revision --autogenerate -m "$(message)"

# 启动开发服务器
run-dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 启动生产服务器
run-prod:
	gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

# 启动 Celery Worker
run-worker:
	celery -A app.core.celery_app worker --loglevel=info

# 启动 Celery Beat
run-beat:
	celery -A app.core.celery_app beat --loglevel=info

# 创建必要的目录
init:
	mkdir -p uploads logs prometheus_data grafana_data
	chmod +x scripts/*.sh

# 安装预提交钩子
setup-hooks:
	pre-commit install

# 安全检查
security-check:
	bandit -r app/
	safety check

# 生成依赖文件
requirements:
	pip freeze > requirements.txt

# 更新所有依赖
update-deps:
	pip-compile --upgrade requirements.in
	pip-compile --upgrade requirements-dev.in

# 构建文档
docs:
	mkdocs build

# 启动文档服务
docs-serve:
	mkdocs serve
