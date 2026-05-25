import uuid

from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

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
