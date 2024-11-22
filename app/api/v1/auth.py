from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import get_settings
from app.core.logger import logger
from app.core.security import create_access_token, get_current_user
from app.models.user import User
from app.schemas.user import User as UserSchema
from app.schemas.user import UserCreate
from app.services.auth_service import AuthService

settings = get_settings()
router = APIRouter(prefix="/auth")
auth_service = AuthService()


@router.post("/register", response_model=UserSchema)
async def register(*, user_in: UserCreate) -> Any:
    """
    注册新用户
    """
    user = await auth_service.create_user(
        username=user_in.username, password=user_in.password, email=user_in.email
    )
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Registration failed. User might already exist.",
        )
    return user


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """
    用户登录
    """
    user = await auth_service.authenticate_user(
        username=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.username,
        scopes=["read", "write"],
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_user)) -> Any:
    """
    获取当前用户信息
    """
    return current_user
