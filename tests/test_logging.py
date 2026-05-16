import json
import logging
from pathlib import Path

from app.core.config import Settings
from app.core.logging import get_logger, setup_logging


def test_setup_logging_writes_to_file(tmp_path: Path) -> None:
    log_file = tmp_path / "app.log"
    settings = Settings(
        environment="test",
        log_file=str(log_file),
        log_file_max_bytes=1024,
        log_file_backup_count=1,
    )

    setup_logging(settings)
    get_logger("test").info("file_log_probe", status="ok")

    root = logging.getLogger()
    for handler in root.handlers[:]:
        handler.flush()
        handler.close()
    root.handlers.clear()
    logging.shutdown()

    content = log_file.read_text(encoding="utf-8")
    assert "file_log_probe" in content
    record = json.loads(content.strip().splitlines()[-1])
    assert record["event"] == "file_log_probe"
    assert record["status"] == "ok"
