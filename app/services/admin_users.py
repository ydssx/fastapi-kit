import secrets
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.core.roles import ADMIN
from app.core.security import get_password_hash
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.user import UserRepository
from app.schemas.admin import AuditLogPublic, PasswordResetResult, UserAdmin, UserUpdate
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

        if await self._active_admin_count_after(user, changes) < 1:
            raise AppException(
                "Cannot remove the last active administrator",
                code=40005,
                status_code=400,
            )

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

    async def _active_admin_count_after(self, user: User, changes: dict[str, Any]) -> int:
        count = await self.users.count_active_admins()
        projected_role = changes.get("role", user.role)
        projected_active = changes.get("is_active", user.is_active)
        was_active_admin = user.role == ADMIN and user.is_active
        will_be_active_admin = projected_role == ADMIN and projected_active
        if was_active_admin and not will_be_active_admin:
            count -= 1
        elif not was_active_admin and will_be_active_admin:
            count += 1
        return count

    async def list_user_audit_logs(
        self,
        user_id: uuid.UUID,
        *,
        limit: int = 20,
    ) -> list[AuditLogPublic]:
        user = await self.users.get_by_id(user_id)
        if not user:
            raise AppException("User not found", code=40401, status_code=404)
        items, _ = await AuditLogRepository(self.session).list_for_user(
            user_id=user_id,
            limit=limit,
        )
        return [AuditLogPublic.model_validate(log) for log in items]

    async def reset_password(
        self,
        actor: User,
        user_id: uuid.UUID,
        *,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> PasswordResetResult:
        user = await self.users.get_by_id(user_id)
        if not user:
            raise AppException("User not found", code=40401, status_code=404)

        temporary_password = secrets.token_urlsafe(12)
        await self.users.update_fields(
            user,
            hashed_password=get_password_hash(temporary_password),
        )

        await self.audit.record(
            actor_id=actor.id,
            action="user.reset_password",
            resource_type="user",
            resource_id=str(user_id),
            detail=None,
            ip=ip,
            user_agent=user_agent,
        )

        return PasswordResetResult(temporary_password=temporary_password)