from app.services.admin_logs import AdminLogsService


def test_build_logql_includes_request_id_filter() -> None:
    logql = AdminLogsService._build_logql(request_id="abc-123", level=None, q=None)
    assert '{job="fastapi"}' in logql
    assert ' |= "abc-123"' in logql


def test_build_logql_escapes_double_quotes_in_request_id() -> None:
    logql = AdminLogsService._build_logql(request_id='evil"id', level=None, q=None)
    assert ' |= "evil\\"id"' in logql


def test_build_logql_escapes_double_quotes_in_keyword() -> None:
    logql = AdminLogsService._build_logql(request_id=None, level=None, q='say"hello')
    assert ' |= "say\\"hello"' in logql


def test_parse_log_line_structured_json() -> None:
    line = (
        '{"level":"info","event":"request_completed","request_id":"trace-1","status_code":200}'
    )
    entry = AdminLogsService._parse_log_line("1700000000000000000", line)
    assert entry is not None
    assert entry.level == "info"
    assert entry.message == "request_completed"
    assert entry.request_id == "trace-1"


def test_parse_log_line_plain_text_fallback() -> None:
    entry = AdminLogsService._parse_log_line("not-a-number", "plain log line")
    assert entry is not None
    assert entry.message == "plain log line"
    assert entry.raw == {"event": "plain log line"}
