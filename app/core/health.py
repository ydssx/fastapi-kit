from typing import Dict, List

import psutil
import redis
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import engine
from app.core.logger import logger

settings = get_settings()

class HealthCheck:
    @staticmethod
    async def check_database() -> Dict:
        """检查数据库连接状态"""
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return {"status": "healthy", "details": "Database connection successful"}
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return {"status": "unhealthy", "details": str(e)}

    @staticmethod
    async def check_redis() -> Dict:
        """检查Redis连接状态"""
        try:
            redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB
            )
            redis_client.ping()
            return {"status": "healthy", "details": "Redis connection successful"}
        except Exception as e:
            logger.error(f"Redis health check failed: {str(e)}")
            return {"status": "unhealthy", "details": str(e)}

    @staticmethod
    async def check_disk_usage() -> Dict:
        """检查磁盘使用情况"""
        try:
            disk = psutil.disk_usage('/')
            return {
                "status": "healthy",
                "details": {
                    "total": f"{disk.total / (1024**3):.2f}GB",
                    "used": f"{disk.used / (1024**3):.2f}GB",
                    "free": f"{disk.free / (1024**3):.2f}GB",
                    "percent": f"{disk.percent}%"
                }
            }
        except Exception as e:
            logger.error(f"Disk usage check failed: {str(e)}")
            return {"status": "unhealthy", "details": str(e)}

    @staticmethod
    async def check_memory_usage() -> Dict:
        """检查内存使用情况"""
        try:
            memory = psutil.virtual_memory()
            return {
                "status": "healthy",
                "details": {
                    "total": f"{memory.total / (1024**3):.2f}GB",
                    "available": f"{memory.available / (1024**3):.2f}GB",
                    "percent": f"{memory.percent}%",
                    "used": f"{memory.used / (1024**3):.2f}GB"
                }
            }
        except Exception as e:
            logger.error(f"Memory usage check failed: {str(e)}")
            return {"status": "unhealthy", "details": str(e)}

    @staticmethod
    async def check_cpu_usage() -> Dict:
        """检查CPU使用情况"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            return {
                "status": "healthy",
                "details": {
                    "usage_percent": f"{cpu_percent}%",
                    "cpu_count": cpu_count
                }
            }
        except Exception as e:
            logger.error(f"CPU usage check failed: {str(e)}")
            return {"status": "unhealthy", "details": str(e)}

    @classmethod
    async def get_system_status(cls) -> Dict:
        """获取完整的系统状态报告"""
        checks = {
            "database": await cls.check_database(),
            "redis": await cls.check_redis(),
            "disk": await cls.check_disk_usage(),
            "memory": await cls.check_memory_usage(),
            "cpu": await cls.check_cpu_usage()
        }
        
        # 确定整体状态
        overall_status = "healthy"
        for check in checks.values():
            if check["status"] == "unhealthy":
                overall_status = "unhealthy"
                break
                
        return {
            "status": overall_status,
            "timestamp": psutil.time.time(),
            "checks": checks
        }
