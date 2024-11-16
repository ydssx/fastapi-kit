from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    APP_NAME: str = "GPT4Free API"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"
    
    # 安全配置
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")  # 提供默认值
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 速率限制
    RATE_LIMIT: int = 60  # 每分钟请求数
    RATE_LIMIT_BURST: int = 100
    
    # 缓存配置  
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL: int = 3600
    
    # 队列配置
    QUEUE_MAX_SIZE: int = 1000
    QUEUE_WORKERS: int = 5
    
    # 模型配置
    DEFAULT_MODEL: str = "you"
    MAX_TOKENS: int = 1000
    DEFAULT_TEMPERATURE: float = 0.7

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
