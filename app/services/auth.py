import secrets
import uuid

from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis import get_redis_client
from app.core.config import Settings, get_settings
from app.core.exceptions import AppException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    get_subject_from_token,
    verify_password,
)
from app.repositories.user import UserRepository
from app.schemas.auth import AuthResponse, RegisterRequest, TokenPair
from app.schemas.user import UserPublic
from app.services.email import send_password_reset_email

PASSWORD_RESET_TOKEN_PREFIX = "password_reset:token:"
PASSWORD_RESET_RATE_PREFIX = "password_reset:rate:"
FORGOT_PASSWORD_MESSAGE = "如果该邮箱已注册，你将收到重置邮件。"
RESET_PASSWORD_SUCCESS_MESSAGE = "密码已重置，请使用新密码登录。"


class AuthService:
    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.users = UserRepository(session)

    async def register(self, payload: RegisterRequest) -> AuthResponse:
        email = payload.email.lower()
        existing = await self.users.get_by_email(email)
        if existing:
            raise AppException("Email already registered", code=40002, status_code=409)

        user = await self.users.create(
            email=email,
            hashed_password=get_password_hash(payload.password),
        )
        tokens = self._build_tokens(user.id)

        return AuthResponse(
            user=UserPublic.model_validate(user),
            tokens=tokens,
        )

    async def login(self, email: str, password: str) -> AuthResponse:
        user = await self.users.get_by_email(email.lower())
        if not user or not verify_password(password, user.hashed_password):
            raise AppException("Invalid email or password", code=40101, status_code=401)
        if not user.is_active:
            raise AppException("User is inactive", code=40102, status_code=403)

        response = AuthResponse(
            user=UserPublic.model_validate(user),
            tokens=self._build_tokens(user.id),
        )
        await self._record_creator_session(user.id)
        return response

    async def refresh(self, refresh_token: str) -> TokenPair:
        try:
            subject = get_subject_from_token(refresh_token, "refresh", self.settings)
            user_id = uuid.UUID(subject)
        except (JWTError, ValueError) as exc:
            raise AppException("Invalid refresh token", code=40103, status_code=401) from exc

        user = await self.users.get_by_id(user_id)
        if not user or not user.is_active:
            raise AppException("User not found or inactive", code=40104, status_code=401)

        return self._build_tokens(user.id)

    async def get_current_user_public(self, user_id: uuid.UUID) -> UserPublic:
        user = await self.users.get_by_id(user_id)
        if not user or not user.is_active:
            raise AppException("User not found", code=40401, status_code=404)
        return UserPublic.model_validate(user)

    async def change_password(
        self,
        user_id: uuid.UUID,
        current_password: str,
        new_password: str,
    ) -> TokenPair:
        user = await self.users.get_by_id(user_id)
        if not user or not verify_password(current_password, user.hashed_password):
            raise AppException("Invalid current password", code=40106, status_code=400)
        await self.users.update_fields(
            user,
            hashed_password=get_password_hash(new_password),
        )
        return self._build_tokens(user.id)

    async def request_password_reset(self, email: str) -> None:
        if not self.settings.smtp_configured:
            raise AppException(
                "Password reset email is not configured",
                code=50301,
                status_code=503,
            )

        redis = get_redis_client()
        email_key = email.lower()
        rate_key = f"{PASSWORD_RESET_RATE_PREFIX}{email_key}"
        count = await redis.incr(rate_key)
        if count == 1:
            await redis.expire(rate_key, 3600)
        if count > self.settings.password_reset_rate_limit_per_hour:
            raise AppException("Too many password reset requests", code=42902, status_code=429)

        user = await self.users.get_by_email(email_key)
        if user is None:
            return

        token = secrets.token_urlsafe(32)
        ttl_seconds = self.settings.password_reset_expire_minutes * 60
        await redis.set(
            f"{PASSWORD_RESET_TOKEN_PREFIX}{token}",
            str(user.id),
            ex=ttl_seconds,
        )
        reset_url = (
            f"{self.settings.app_public_url.rstrip('/')}/creator/reset-password?token={token}"
        )
        await send_password_reset_email(
            self.settings,
            to_email=user.email,
            reset_url=reset_url,
        )

    async def reset_password(self, token: str, new_password: str) -> None:
        redis = get_redis_client()
        user_id_raw = await redis.get(f"{PASSWORD_RESET_TOKEN_PREFIX}{token}")
        if not user_id_raw:
            raise AppException(
                "Invalid or expired reset token",
                code=40022,
                status_code=400,
            )

        try:
            user_id = uuid.UUID(user_id_raw)
        except ValueError as exc:
            raise AppException(
                "Invalid or expired reset token",
                code=40022,
                status_code=400,
            ) from exc

        user = await self.users.get_by_id(user_id)
        if not user or not user.is_active:
            raise AppException(
                "Invalid or expired reset token",
                code=40022,
                status_code=400,
            )

        await self.users.update_fields(
            user,
            hashed_password=get_password_hash(new_password),
        )
        await redis.delete(f"{PASSWORD_RESET_TOKEN_PREFIX}{token}")

    def _build_tokens(self, user_id: uuid.UUID) -> TokenPair:
        return TokenPair(
            access_token=create_access_token(user_id, self.settings),
            refresh_token=create_refresh_token(user_id, self.settings),
        )

    async def _record_creator_session(self, user_id: uuid.UUID) -> None:
        from app.services.creator_events import CreatorEventService

        await CreatorEventService(self.session).record(
            user_id=user_id,
            event_type="user.session",
        )
