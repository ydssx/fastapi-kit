from typing import Dict, List

from fastapi import WebSocket

from app.core.logger import logger


class ConnectionManager:
    def __init__(self):
        # 存储所有活动连接
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        """建立WebSocket连接"""
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        self.active_connections[client_id].append(websocket)
        logger.info(
            f"Client {client_id} connected. Total connections: {len(self.active_connections)}"
        )

    async def disconnect(self, websocket: WebSocket, client_id: str):
        """断开WebSocket连接"""
        if client_id in self.active_connections:
            self.active_connections[client_id].remove(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        logger.info(
            f"Client {client_id} disconnected. Total connections: {len(self.active_connections)}"
        )

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """发送个人消息"""
        await websocket.send_text(message)

    async def broadcast(self, message: str, exclude: str = None):
        """广播消息"""
        for client_id, connections in self.active_connections.items():
            if client_id != exclude:
                for connection in connections:
                    await connection.send_text(message)

    async def send_to_client(self, client_id: str, message: str):
        """发送消息给特定客户端"""
        if client_id in self.active_connections:
            for connection in self.active_connections[client_id]:
                await connection.send_text(message)


# 创建全局WebSocket管理器
manager = ConnectionManager()
