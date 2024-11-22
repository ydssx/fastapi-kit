from typing import Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

from app.core.logger import logger
from app.core.security import get_current_user
from app.core.websocket import manager

router = APIRouter()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket, client_id: str, token: Optional[str] = Query(None)
):
    """
    WebSocket连接端点
    """
    try:
        # 验证token（可选）
        if token:
            try:
                await get_current_user(token)
            except Exception as e:
                await websocket.close(code=1008, reason="Invalid token")
                return

        # 建立连接
        await manager.connect(websocket, client_id)
        try:
            while True:
                # 接收消息
                data = await websocket.receive_text()
                logger.info(f"Message received from client {client_id}: {data}")

                # 发送回执
                await manager.send_personal_message(f"You wrote: {data}", websocket)

                # 广播消息给其他客户端
                await manager.broadcast(
                    f"Client {client_id} says: {data}", exclude=client_id
                )

        except WebSocketDisconnect:
            await manager.disconnect(websocket, client_id)
            await manager.broadcast(f"Client {client_id} left the chat")

    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.close(code=1011, reason="Internal server error")
