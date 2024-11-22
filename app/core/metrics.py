import time

from prometheus_client import Counter, Gauge, Histogram, Info

# 请求计数器
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status"],
)

# 请求延迟直方图
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
)

# 活动用户数量
ACTIVE_USERS = Gauge("active_users", "Number of active users")

# CPU使用率
CPU_USAGE = Gauge("cpu_usage_percent", "CPU usage percentage")

# 内存使用率
MEMORY_USAGE = Gauge("memory_usage_percent", "Memory usage percentage")

# 磁盘使用率
DISK_USAGE = Gauge("disk_usage_percent", "Disk usage percentage")

# 应用信息
APP_INFO = Info("application_info", "Application information")


class MetricsMiddleware:
    def __init__(self):
        pass

    async def __call__(self, request, call_next):
        start_time = time.time()

        response = await call_next(request)

        # 记录请求数量
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code,
        ).inc()

        # 记录请求延迟
        REQUEST_LATENCY.labels(
            method=request.method, endpoint=request.url.path
        ).observe(time.time() - start_time)

        return response


def init_metrics(app_name: str, version: str):
    """初始化应用指标"""
    APP_INFO.info({"name": app_name, "version": version})
