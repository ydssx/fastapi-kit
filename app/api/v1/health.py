from fastapi import APIRouter, Depends

from app.core.health import HealthCheck
from app.core.security import get_current_user

router = APIRouter()

@router.get("/health")
async def health_check():
    """
    基本健康检查端点
    """
    return {"status": "healthy"}

@router.get("/health/detailed")
async def detailed_health_check(current_user: dict = Depends(get_current_user)):
    """
    详细的系统健康状态检查（需要认证）
    """
    return await HealthCheck.get_system_status()

@router.get("/health/database")
async def database_health_check(current_user: dict = Depends(get_current_user)):
    """
    数据库健康状态检查
    """
    return await HealthCheck.check_database()

@router.get("/health/redis")
async def redis_health_check(current_user: dict = Depends(get_current_user)):
    """
    Redis健康状态检查
    """
    return await HealthCheck.check_redis()

@router.get("/health/disk")
async def disk_health_check(current_user: dict = Depends(get_current_user)):
    """
    磁盘使用状态检查
    """
    return await HealthCheck.check_disk_usage()

@router.get("/health/memory")
async def memory_health_check(current_user: dict = Depends(get_current_user)):
    """
    内存使用状态检查
    """
    return await HealthCheck.check_memory_usage()

@router.get("/health/cpu")
async def cpu_health_check(current_user: dict = Depends(get_current_user)):
    """
    CPU使用状态检查
    """
    return await HealthCheck.check_cpu_usage()
