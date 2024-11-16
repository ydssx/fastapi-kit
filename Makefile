# 基础命令
.PHONY: install test run clean build docker-build docker-run

# 安装依赖
install:
	pip install -r requirements.txt

# 运行测试
test:
	pytest tests/

# 本地运行
run:
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 清理缓存文件
clean:
	find . -type d -name "__pycache__" -exec rm -r {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete

# 构建Docker镜像
docker-build:
	docker build -t chatgpt-api -f Dockerfile.optimized .

# 运行Docker容器
docker-run:
	docker run -d -p 8000:8000 --name chatgpt-api chatgpt-api

# 停止并删除Docker容器
docker-clean:
	docker stop chatgpt-api || true
	docker rm chatgpt-api || true
