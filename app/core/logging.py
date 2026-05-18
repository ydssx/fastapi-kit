import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

import structlog

from app.core.config import Settings

_THIRD_PARTY_LOGGERS = (
    "uvicorn",
    "uvicorn.error",
    "uvicorn.access",
    "fastapi",
    "celery",
    "celery.task",
    "celery.worker",
    "celery.beat",
    "alembic",
    "sqlalchemy.engine",
    "httpx",
    "httpcore",
)


def _shared_processors() -> list[structlog.types.Processor]:
    return [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.ExtraAdder(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]


def _configure_third_party_loggers(level: int) -> None:
    for name in _THIRD_PARTY_LOGGERS:
        lib_logger = logging.getLogger(name)
        lib_logger.handlers.clear()
        lib_logger.propagate = True
        lib_logger.setLevel(level)


def setup_logging(settings: Settings | None = None, *, log_level: str | None = None) -> None:
    from app.core.config import get_settings

    settings = settings or get_settings()
    level_name = log_level or settings.log_level
    level = getattr(logging, level_name.upper(), logging.INFO)

    shared = _shared_processors()
    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.JSONRenderer(),
        ],
    )

    handlers: list[logging.Handler] = []
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    handlers.append(stream_handler)

    if settings.log_file:
        log_path = Path(settings.log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_path,
            maxBytes=settings.log_file_max_bytes,
            backupCount=settings.log_file_backup_count,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        handlers.append(file_handler)

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)
    for handler in handlers:
        root.addHandler(handler)

    structlog.configure(
        processors=shared
        + [
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    _configure_third_party_loggers(level)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    logger: structlog.stdlib.BoundLogger = structlog.get_logger(name)
    return logger
