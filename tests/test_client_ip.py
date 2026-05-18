from starlette.requests import Request

from app.middleware.client_ip import get_client_ip


def _request(headers: list[tuple[bytes, bytes]] | None = None) -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": headers or [],
        "client": ("203.0.113.10", 12345),
    }
    return Request(scope)


def test_get_client_ip_uses_socket_when_proxy_headers_disabled() -> None:
    request = _request([(b"x-forwarded-for", b"198.51.100.1")])
    assert get_client_ip(request, trust_proxy_headers=False) == "203.0.113.10"


def test_get_client_ip_uses_forwarded_for_when_trusted() -> None:
    request = _request([(b"x-forwarded-for", b"198.51.100.1, 10.0.0.1")])
    assert get_client_ip(request, trust_proxy_headers=True) == "198.51.100.1"


def test_get_client_ip_falls_back_to_real_ip() -> None:
    request = _request([(b"x-real-ip", b"198.51.100.2")])
    assert get_client_ip(request, trust_proxy_headers=True) == "198.51.100.2"
