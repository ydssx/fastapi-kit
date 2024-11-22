import logging
import sys
from typing import Any

from loguru import logger

from app.core.config import get_settings

settings = get_settings()

# 移除默认的处理程序
logger.remove()

# 添加控制台处理程序
logger.add(
    sys.stdout,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}",
    level=settings.LOG_LEVEL,
    colorize=True,
)

# 添加文件处理程序
logger.add(
    "logs/app.log",
    rotation="500 MB",
    retention="10 days",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}",
    level=settings.LOG_LEVEL,
    compression="zip",
)


class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_logging():
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    # for _log in ["uvicorn", "uvicorn.error", "fastapi"]:
    #     _logger = logging.getLogger(_log)
    #     _logger.handlers = [InterceptHandler()]
    return logger
