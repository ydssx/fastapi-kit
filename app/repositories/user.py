import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import ADMIN
from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(
        self,
        email: str,
        hashed_password: str,
        *,
        role: str | None = None,
    ) -> User:
        user = User(email=email, hashed_password=hashed_password)
        if role is not None:
            user.role = role
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def count_all(self) -> int:
        result = await self.session.execute(select(func.count()).select_from(User))
        return int(result.scalar_one())

    async def count_active(self) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(User).where(User.is_active.is_(True))
        )
        return int(result.scalar_one())

    async def count_active_admins(self) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(User)
            .where(User.is_active.is_(True), User.role == ADMIN)
        )
        return int(result.scalar_one())

    async def list_paginated(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        email: str | None = None,
        is_active: bool | None = None,
        role: str | None = None,
    ) -> tuple[list[User], int]:
        query = select(User)
        count_query = select(func.count()).select_from(User)

        if email:
            pattern = f"%{email.lower()}%"
            query = query.where(User.email.ilike(pattern))
            count_query = count_query.where(User.email.ilike(pattern))
        if is_active is not None:
            query = query.where(User.is_active.is_(is_active))
            count_query = count_query.where(User.is_active.is_(is_active))
        if role is not None:
            query = query.where(User.role == role)
            count_query = count_query.where(User.role == role)

        total_result = await self.session.execute(count_query)
        total = int(total_result.scalar_one())

        offset = (page - 1) * page_size
        result = await self.session.execute(
            query.order_by(User.created_at.desc()).offset(offset).limit(page_size)
        )
        return list(result.scalars().all()), total

    async def update_fields(self, user: User, **fields: object) -> User:
        for key, value in fields.items():
            if value is not None:
                setattr(user, key, value)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def promote_to_admin(self, user: User) -> User:
        user.role = ADMIN
        await self.session.flush()
        await self.session.refresh(user)
        return user
