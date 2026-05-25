from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import AppException
from app.models.user import User
from app.repositories.creator_usage import CreatorUsageRepository
from app.schemas.creator import UsageOut


class CreatorUsageService:
    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.usage = CreatorUsageRepository(session)

    @staticmethod
    def current_year_month() -> str:
        return datetime.now(UTC).strftime("%Y-%m")

    def _limits(self, user: User) -> tuple[int, int]:
        multiplier = self.settings.creator_pro_multiplier if user.plan == "pro" else 1
        completed_limit = self.settings.creator_free_completed_projects_per_month * multiplier
        ai_limit = self.settings.creator_free_ai_calls_per_month * multiplier
        return completed_limit, ai_limit

    async def get_usage(self, user: User) -> UsageOut:
        year_month = self.current_year_month()
        counter = await self.usage.get_or_create(user.id, year_month)
        completed_limit, ai_limit = self._limits(user)
        return UsageOut(
            year_month=year_month,
            completed_projects=counter.completed_projects,
            completed_projects_limit=completed_limit,
            ai_calls=counter.ai_calls,
            ai_calls_limit=ai_limit,
            plan=user.plan,
        )

    async def check_ai_quota(self, user: User) -> None:
        usage = await self.get_usage(user)
        if usage.ai_calls >= usage.ai_calls_limit:
            raise AppException(
                "Monthly AI assist limit reached. Upgrade to Pro for more.",
                code=40201,
                status_code=402,
            )

    async def check_completed_quota(self, user: User) -> None:
        usage = await self.get_usage(user)
        if usage.completed_projects >= usage.completed_projects_limit:
            raise AppException(
                "Monthly completed project limit reached. Upgrade to Pro for more.",
                code=40202,
                status_code=402,
            )

    async def increment_ai(self, user: User) -> None:
        counter = await self.usage.get_or_create(user.id, self.current_year_month())
        counter.ai_calls += 1
        await self.usage.save(counter)

    async def increment_completed(self, user: User) -> None:
        counter = await self.usage.get_or_create(user.id, self.current_year_month())
        counter.completed_projects += 1
        await self.usage.save(counter)
