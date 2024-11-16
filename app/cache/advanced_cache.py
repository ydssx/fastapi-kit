from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
from typing import Optional
import hashlib

class AdvancedCache:
    def __init__(self):
        self.ttl = 3600  # 默认缓存1小时

    def generate_cache_key(self, prompt: str, model: str) -> str:
        """生成缓存键"""
        key = f"{prompt}:{model}"
        return hashlib.md5(key.encode()).hexdigest()

    @cache(expire=3600)
    async def get_cached_response(self, prompt: str, model: str) -> Optional[str]:
        """获取缓存的响应"""
        cache_key = self.generate_cache_key(prompt, model)
        return await FastAPICache.get(cache_key)

    async def set_cached_response(self, prompt: str, model: str, response: str):
        """设置缓存响应"""
        cache_key = self.generate_cache_key(prompt, model)
        await FastAPICache.set(cache_key, response, expire=self.ttl)
