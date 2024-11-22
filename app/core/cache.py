import json
from typing import Any, Optional

from redis import Redis

from app.core.config import get_settings

settings = get_settings()


class RedisCache:
    def __init__(self):
        self.redis_client = Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True,
        )

    async def get(self, key: str) -> Optional[Any]:
        """获取缓存值"""
        data = self.redis_client.get(key)
        if data:
            return json.loads(data)
        return None

    async def set(
        self, key: str, value: Any, expire: int = 60 * 60  # 默认1小时
    ) -> bool:
        """设置缓存值"""
        try:
            return self.redis_client.setex(key, expire, json.dumps(value))
        except Exception:
            return False

    async def delete(self, key: str) -> bool:
        """删除缓存值"""
        return bool(self.redis_client.delete(key))

    async def exists(self, key: str) -> bool:
        """检查键是否存在"""
        return bool(self.redis_client.exists(key))

    async def clear(self) -> bool:
        """清除所有缓存"""
        try:
            self.redis_client.flushdb()
            return True
        except Exception:
            return False


# 创建全局缓存实例
cache = RedisCache()
