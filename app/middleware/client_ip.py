from starlette.requests import Request


def get_client_ip(request: Request, *, trust_proxy_headers: bool) -> str:
    if trust_proxy_headers:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client = forwarded_for.split(",")[0].strip()
            if client:
                return client
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            client = real_ip.strip()
            if client:
                return client
    if request.client:
        return request.client.host
    return "unknown"
