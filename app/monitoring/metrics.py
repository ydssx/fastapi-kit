from prometheus_client import Counter, Histogram, Gauge
import time
from contextlib import contextmanager

class Metrics:
    def __init__(self):
        self.request_count = Counter(
            'api_request_count',
            'Total request count',
            ['endpoint', 'method', 'status']
        )
        
        self.request_latency = Histogram(
            'api_request_latency_seconds',
            'Request latency in seconds',
            ['endpoint']
        )
        
        self.active_requests = Gauge(
            'api_active_requests',
            'Number of active requests'
        )

    def track_request(self, endpoint: str, method: str, status: int):
        self.request_count.labels(endpoint=endpoint, method=method, status=status).inc()

    @contextmanager
    def track_latency(self, endpoint: str):
        start_time = time.time()
        self.active_requests.inc()
        try:
            yield
        finally:
            self.active_requests.dec()
            self.request_latency.labels(endpoint=endpoint).observe(time.time() - start_time)
