from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from .config import settings

# 添加数据库连接池配置
engine = create_async_engine(
    settings.DATABASE_URL,
    # connect_args={"check_same_thread": False},  # 仅用于SQLite
    pool_pre_ping=True,  # 自动处理断开的连接
    pool_size=5,  # 连接池大小
    max_overflow=10,  # 最大额外连接数
    pool_recycle=3600,  # 连接回收时间(秒)
    echo=True,
)


async def get_db():
    """
    获取数据库会话的依赖函数

    Yields:
        AsyncSession: SQLAlchemy会话实例
    """
    async with AsyncSession(engine) as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise e
