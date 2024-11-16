from fastapi import APIRouter, Request
from typing import Dict, Any
import psutil
import os
from prometheus_client import generate_latest
from fastapi_cache import FastAPICache
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check(request: Request) -> Dict[str, Any]:
    return {
        "status": "healthy",
        "system": {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent
        },
        "queue_size": request.app.state.queue.qsize() if hasattr(request.app.state, 'queue') else 0,
        "active_requests": len(request.app.state.queue.processing) if hasattr(request.app.state, 'queue') else 0
    }

@router.get("/metrics")
async def metrics():
    return generate_latest()

@router.get("/health/detailed")
async def detailed_health_check(request: Request) -> Dict[str, Any]:
    """详细的健康检查"""
    redis_status = "healthy"
    try:
        redis = FastAPICache.get_backend()  # 移除 await
        if hasattr(redis, 'get'):
            await redis.get("health_check")
    except Exception:
        redis_status = "unhealthy"
        
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "redis": redis_status,
            "api": "healthy"
        },
        "system": {
            "cpu_percent": psutil.cpu_percent(),
            "memory": {
                "total": psutil.virtual_memory().total,
                "available": psutil.virtual_memory().available,
                "percent": psutil.virtual_memory().percent
            },
            "disk": {
                "total": psutil.disk_usage('/').total,
                "free": psutil.disk_usage('/').free,
                "percent": psutil.disk_usage('/').percent
            }
        },
        "queue": {
            "size": request.app.state.queue.qsize() if hasattr(request.app.state, 'queue') else 0,
            "active_requests": len(request.app.state.queue.processing) if hasattr(request.app.state, 'queue') else 0
        }
    }
