from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any

from app.api.v1 import auth, files, health, items, metrics, ws, chat
from app.core.config import settings
from app.core.logger import setup_logging
from app.core.metrics import init_metrics
from app.core.middlewares.security import (
    ExceptionMiddleware,
    RequestIDMiddleware,
    RequestLoggingMiddleware,
    ResponseTimeMiddleware,
)


# 设置日志
logger = setup_logging()


def create_app() -> FastAPI:
    """
    创建和配置FastAPI应用
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=settings.DESCRIPTION,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # 初始化指标
    init_metrics(settings.PROJECT_NAME, settings.VERSION)

    # 配置中间件
    configure_middlewares(app)

    # 注册路由
    configure_routes(app)

    return app


def configure_middlewares(app: FastAPI) -> None:
    """
    配置所有中间件
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(ExceptionMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(ResponseTimeMiddleware)


def configure_routes(app: FastAPI) -> None:
    """
    配置所有路由
    """
    routers = [
        (auth.router, "auth"),
        (items.router, "items"),
        (files.router, "files"),
        (ws.router, "websocket"),
        (health.router, "health"),
        (metrics.router, "metrics"),
        (chat.router, "chat"),
    ]

    for router, tag in routers:
        app.include_router(router, prefix=settings.API_V1_STR, tags=[tag])


app = create_app()


@app.get("/", response_model=Dict[str, Any])
async def root() -> Dict[str, Any]:
    """
    根路径端点
    """
    logger.info("Accessing root endpoint")
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
    }


@app.get("/health", response_model=Dict[str, Any])
async def health_check() -> Dict[str, Any]:
    """
    健康检查端点
    """
    logger.info("Performing health check")
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "environment": "development",
    }


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting {settings.PROJECT_NAME}")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 开发模式下启用热重载
        workers=4,  # 生产环境可以调整workers数量
    )