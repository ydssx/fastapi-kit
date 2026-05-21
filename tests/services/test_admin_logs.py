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
