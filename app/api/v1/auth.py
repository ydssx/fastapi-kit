from fastapi import APIRouter, BackgroundTasks, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
)
from app.schemas.common import ApiResponse
from app.schemas.user import UserPublic
from app.services.auth import AuthService
from app.tasks.example import send_notification

router = APIRouter()


def _queue_welcome_notification(user_id: str) -> None:
    settings = get_settings()
    send_notification.delay(user_id, f"Welcome to {settings.app_name}!")


@router.post(
    "/register",
    response_model=ApiResponse[AuthResponse],
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    db: DbSession,
    background_tasks: BackgroundTasks,
) -> ApiResponse[AuthResponse]:
    result = await AuthService(db).register(payload)
    background_tasks.add_task(_queue_welcome_notification, str(result.user.id))
    return ApiResponse(data=result)


@router.post("/login", response_model=ApiResponse[AuthResponse])
async def login(payload: LoginRequest, db: DbSession) -> ApiResponse[AuthResponse]:
    result = await AuthService(db).login(payload.email, payload.password)
    return ApiResponse(data=result)


@router.post("/refresh", response_model=ApiResponse[TokenPair])
async def refresh(payload: RefreshRequest, db: DbSession) -> ApiResponse[TokenPair]:
    result = await AuthService(db).refresh(payload.refresh_token)
    return ApiResponse(data=result)


@router.get("/me", response_model=ApiResponse[UserPublic])
async def me(current_user: CurrentUser) -> ApiResponse[UserPublic]:
    return ApiResponse(data=UserPublic.model_validate(current_user))
