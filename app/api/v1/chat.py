from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.api.v1 import auth
from app.schemas.chat import ChatRequest, ChatResponse, ChatStreamResponse
from app.services.chat_service import chat_service
from app.services.auth_service import AuthService
from app.schemas.user import User
import json

auth_service = AuthService()
router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest, current_user: User = Depends(auth_service.get_current_user)
) -> ChatResponse:
    """
    Chat endpoint that processes messages and returns AI responses
    """
    if request.stream:
        raise HTTPException(
            status_code=400,
            detail="For streaming responses, use the /chat/stream endpoint",
        )

    try:
        response = await chat_service.chat_completion(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    # current_user: User = Depends(
    #     auth_service.get_current_user,
    # ),
) -> StreamingResponse:
    """
    Streaming chat endpoint that returns AI responses as a stream of server-sent events
    """
    try:

        async def generate():
            async for chunk in chat_service.chat_completion_stream(request):
                yield f"data: {json.dumps(chunk.dict())}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream; charset=utf-8",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Transfer-Encoding": "chunked",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
