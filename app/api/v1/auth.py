from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
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

router = APIRouter()


@router.post(
    "/register",
    response_model=ApiResponse[AuthResponse],
    status_code=status.HTTP_201_CREATED,
)
async def register(payload: RegisterRequest, db: DbSession) -> ApiResponse[AuthResponse]:
    result = await AuthService(db).register(payload)
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
async def me(current_user: CurrentUser, db: DbSession) -> ApiResponse[UserPublic]:
    result = await AuthService(db).get_current_user_public(current_user.id)
    return ApiResponse(data=result)
