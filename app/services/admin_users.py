import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.core.roles import ADMIN
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.admin import UserAdmin, UserUpdate
from app.schemas.pagination import PaginatedResponse
from app.services.audit import AuditService


class AdminUserService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.audit = AuditService(session)

    async def list_users(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        email: str | None = None,
        is_active: bool | None = None,
        role: str | None = None,
    ) -> PaginatedResponse[UserAdmin]:
        items, total = await self.users.list_paginated(
            page=page,
            page_size=page_size,
            email=email,
            is_active=is_active,
            role=role,
        )
        return PaginatedResponse(
            items=[UserAdmin.model_validate(u) for u in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_user(self, user_id: uuid.UUID) -> UserAdmin:
        user = await self.users.get_by_id(user_id)
        if not user:
            raise AppException("User not found", code=40401, status_code=404)
        return UserAdmin.model_validate(user)

    async def update_user(
        self,
        actor: User,
        user_id: uuid.UUID,
        payload: UserUpdate,
        *,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> UserAdmin:
        user = await self.users.get_by_id(user_id)
        if not user:
            raise AppException("User not found", code=40401, status_code=404)

        if user.id == actor.id:
            if payload.is_active is False:
                raise AppException(
                    "Cannot deactivate your own account",
                    code=40003,
                    status_code=400,
                )
            if payload.role is not None and payload.role != ADMIN:
                raise AppException(
                    "Cannot demote your own admin role",
                    code=40004,
                    status_code=400,
                )

        changes: dict[str, Any] = {}
        if payload.is_active is not None:
            changes["is_active"] = payload.is_active
        if payload.role is not None:
            changes["role"] = payload.role

        if not changes:
            return UserAdmin.model_validate(user)

        updated = await self.users.update_fields(user, **changes)

        await self.audit.record(
            actor_id=actor.id,
            action="user.update",
            resource_type="user",
            resource_id=str(user_id),
            detail=changes,
            ip=ip,
            user_agent=user_agent,
        )

        return UserAdmin.model_validate(updated)
