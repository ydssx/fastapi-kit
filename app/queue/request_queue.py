import asyncio
from typing import Callable, Any
from collections import deque

class RequestQueue:
    def __init__(self, max_size: int = 100):
        self.queue = asyncio.Queue(maxsize=max_size)
        self.processing = set()
        self._stop = False

    async def add_request(self, task: Callable, *args, **kwargs) -> Any:
        if self._stop:
            raise RuntimeError("Queue is stopped")
        
        task_id = id(task)
        await self.queue.put((task_id, task, args, kwargs))
        return task_id

    async def process_queue(self):
        while not self._stop:
            try:
                task_id, task, args, kwargs = await self.queue.get()
                self.processing.add(task_id)
                try:
                    result = await task(*args, **kwargs)
                    await self.handle_success(task_id, result)
                except Exception as e:
                    await self.handle_error(task_id, e)
                finally:
                    self.processing.remove(task_id)
                    self.queue.task_done()
            except asyncio.CancelledError:
                break

    async def handle_success(self, task_id: int, result: Any):
        # 处理成功的请求
        pass

    async def handle_error(self, task_id: int, error: Exception):
        # 处理失败的请求
        pass
