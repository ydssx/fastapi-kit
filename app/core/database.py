from typing import Generator
from sqlmodel import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base

from .config import get_settings
from .logger import logger

settings = get_settings()

# 添加数据库连接池配置
engine = create_engine(
    settings.DATABASE_URL,
    # connect_args={"check_same_thread": False},  # 仅用于SQLite
    pool_pre_ping=True,  # 自动处理断开的连接
    pool_size=5,  # 连接池大小
    max_overflow=10,  # 最大额外连接数
    pool_recycle=3600,  # 连接回收时间(秒)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    获取数据库会话的依赖函数

    Yields:
        Session: SQLAlchemy会话实例
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        logger.info("Closing database connection")
        db.close()
