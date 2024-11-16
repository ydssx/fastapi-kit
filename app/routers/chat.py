from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator, Dict, Any, Sequence, cast
from ..services.stream_service import StreamService
from ..models.chat import ChatRequest, ChatResponse
from ..auth.jwt import AuthHandler
from g4f.client import Client

router = APIRouter()
auth_handler = AuthHandler()
stream_service = StreamService()


@router.get("/chat/stream")
async def chat_stream(
    prompt: str,
    # request: ChatRequest,
    # user_id: str = Depends(auth_handler.get_current_user)
) -> StreamingResponse:
    """处理流式聊天请求"""
    try:
        messages: Sequence[Dict[str, Any]] = [{"role": "user", "content": prompt}]
        return StreamingResponse(
            stream_service.create_stream_response(
                messages=messages, model="claude-3.5-sonnet"
            ),
            media_type="text/event-stream",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest, user_id: str = Depends(auth_handler.get_current_user)
):
    """处理普通聊天请求"""
    if request.stream:
        return await chat_stream(request, user_id)
    try:
        messages: Sequence[Dict[str, Any]] = [
            {"role": "user", "content": request.prompt}
        ]
        response = await stream_service.client.chat.completions.async_create(
            model="claude-3-5-sonnet", messages=messages, stream=False
        )

        # 类型安全的响应处理
        if not response or not hasattr(response, "choices") or not response.choices:
            content = ""
        else:
            message = getattr(response.choices[0], "message", None)
            content = getattr(message, "content", "") if message else ""

        return ChatResponse(
            text=content or "", model="claude-3-5-sonnet"  # 确保永远返回字符串
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
