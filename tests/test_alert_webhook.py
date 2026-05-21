import hashlib
import hmac

import pytest

from app.services.alert_webhook import sign_payload, validate_webhook_url


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
