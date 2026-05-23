import hashlib
import hmac

import pytest

from app.core.config import Settings
from app.services.alert_webhook import build_alert_payload, sign_payload, validate_webhook_url


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/hook",
        "http://127.0.0.1:8080/alerts",
    ],
)
def test_validate_webhook_url_accepts_http_and_https(url: str) -> None:
    validate_webhook_url(url)


@pytest.mark.parametrize(
    "url",
    [
        "ftp://example.com/hook",
        "javascript:alert(1)",
        "not-a-url",
        "https://",
    ],
)
def test_validate_webhook_url_rejects_invalid_urls(url: str) -> None:
    with pytest.raises(ValueError):
        validate_webhook_url(url)


def test_sign_payload_matches_hmac_sha256() -> None:
    body = b'{"event":"test"}'
    secret = "s3cret"
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    assert sign_payload(body, secret) == f"sha256={expected}"


def test_build_alert_payload_includes_known_summary() -> None:
    settings = Settings(
        environment="dev",
        database_url="postgresql+asyncpg://unused",
        redis_url="redis://unused",
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
    )
    payload = build_alert_payload(
        event_type="ready_failed",
        settings=settings,
        details={"database": "error"},
    )
    assert payload["event"] == "ready_failed"
    assert payload["environment"] == "dev"
    assert "readiness" in payload["summary"].lower()
    assert payload["details"] == {"database": "error"}
    assert "timestamp" in payload


def test_build_alert_payload_falls_back_to_event_type_for_unknown_events() -> None:
    settings = Settings(
        environment="test",
        database_url="postgresql+asyncpg://unused",
        redis_url="redis://unused",
        jwt_secret="test-secret-key-for-jwt-signing-32chars",
    )
    payload = build_alert_payload(event_type="custom.event", settings=settings)
    assert payload["summary"] == "custom.event"
    assert payload["details"] == {}
