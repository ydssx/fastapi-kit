from fastapi import APIRouter
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.core.metrics import (ACTIVE_USERS, CPU_USAGE, DISK_USAGE,
                              MEMORY_USAGE, REQUEST_COUNT, REQUEST_LATENCY)

router = APIRouter()


@router.get("/metrics")
async def metrics():
    """
    导出Prometheus指标
    """
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
