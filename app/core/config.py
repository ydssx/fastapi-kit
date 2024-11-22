import os
from typing import List, Union

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 基本配置
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "FastAPI Microservice"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = (
        "Advanced FastAPI Microservice with Authentication, Caching, and Task Processing"
    )
    DEBUG: bool = True

    # 安全配置
    SECRET_KEY: str = "your-secret-key-here"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"

    # 数据库配置
    DATABASE_URL: str = "sqlite:///./app.db"

    # Redis配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery配置
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # OpenAI配置
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # CORS配置
    BACKEND_CORS_ORIGINS: Union[List[AnyHttpUrl], List[str]] = ["*"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "app.log"

    # 文件上传配置
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB

    # WebSocket配置
    WS_MESSAGE_QUEUE: str = "redis://localhost:6379/2"

    # 速率限制配置
    RATE_LIMIT_TIMES: int = 100  # 每分钟请求次数
    RATE_LIMIT_SECONDS: int = 60

    class Config:
        case_sensitive = True
        env_file = ".env"


# 创建全局设置实例
_settings = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()

        # 确保上传目录存在
        os.makedirs(_settings.UPLOAD_DIR, exist_ok=True)

    return _settings


settings = get_settings()
