from fastapi import APIRouter, BackgroundTasks, status

from app.api.deps import CurrentUser, DbSession, SettingsDep
from app.core.config import get_settings
from app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageOut,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
)
from app.schemas.common import ApiResponse
from app.schemas.user import UserPublic
from app.services.auth import (
    FORGOT_PASSWORD_MESSAGE,
    RESET_PASSWORD_SUCCESS_MESSAGE,
    AuthService,
)
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
    settings: SettingsDep,
    background_tasks: BackgroundTasks,
) -> ApiResponse[AuthResponse]:
    result = await AuthService(db, settings).register(payload)
    background_tasks.add_task(_queue_welcome_notification, str(result.user.id))
    return ApiResponse(data=result)


@router.post("/login", response_model=ApiResponse[AuthResponse])
async def login(payload: LoginRequest, db: DbSession, settings: SettingsDep) -> ApiResponse[AuthResponse]:
    result = await AuthService(db, settings).login(payload.email, payload.password)
    return ApiResponse(data=result)


@router.post("/refresh", response_model=ApiResponse[TokenPair])
async def refresh(payload: RefreshRequest, db: DbSession, settings: SettingsDep) -> ApiResponse[TokenPair]:
    result = await AuthService(db, settings).refresh(payload.refresh_token)
    return ApiResponse(data=result)


@router.get("/me", response_model=ApiResponse[UserPublic])
async def me(current_user: CurrentUser) -> ApiResponse[UserPublic]:
    return ApiResponse(data=UserPublic.model_validate(current_user))


@router.post("/change-password", response_model=ApiResponse[TokenPair])
async def change_password(
    current_user: CurrentUser,
    db: DbSession,
    settings: SettingsDep,
    payload: ChangePasswordRequest,
) -> ApiResponse[TokenPair]:
    tokens = await AuthService(db, settings).change_password(
        current_user.id,
        payload.current_password,
        payload.new_password,
    )
    return ApiResponse(data=tokens)


@router.post("/forgot-password", response_model=ApiResponse[MessageOut])
async def forgot_password(
    db: DbSession,
    settings: SettingsDep,
    payload: ForgotPasswordRequest,
) -> ApiResponse[MessageOut]:
    await AuthService(db, settings).request_password_reset(payload.email)
    return ApiResponse(data=MessageOut(message=FORGOT_PASSWORD_MESSAGE))


@router.post("/reset-password", response_model=ApiResponse[MessageOut])
async def reset_password(
    db: DbSession,
    settings: SettingsDep,
    payload: ResetPasswordRequest,
) -> ApiResponse[MessageOut]:
    await AuthService(db, settings).reset_password(payload.token, payload.new_password)
    return ApiResponse(data=MessageOut(message=RESET_PASSWORD_SUCCESS_MESSAGE))
