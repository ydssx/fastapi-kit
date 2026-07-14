import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.creator import CreatorBrandProfile
from app.repositories.creator_brand import CreatorBrandRepository
from app.schemas.creator import BrandProfileOut, BrandProfileUpdate


class CreatorBrandService:
    def __init__(self, session: AsyncSession) -> None:
        self.brands = CreatorBrandRepository(session)

    async def get_profile(self, user_id: uuid.UUID) -> BrandProfileOut:
        profile = await self.brands.get_by_user(user_id)
        if profile is None:
            return BrandProfileOut(
                tone="",
                audience="",
                taboos="",
                structure_notes="",
            )
        return _profile_to_out(profile)

    async def update_profile(
        self, user_id: uuid.UUID, payload: BrandProfileUpdate
    ) -> BrandProfileOut:
        profile = await self.brands.get_by_user(user_id)
        if profile is None:
            profile = CreatorBrandProfile(user_id=user_id)
        profile.tone = payload.tone
        profile.audience = payload.audience
        profile.taboos = payload.taboos
        profile.structure_notes = payload.structure_notes
        saved = await self.brands.upsert(profile)
        return _profile_to_out(saved)


def _profile_to_out(profile: CreatorBrandProfile) -> BrandProfileOut:
    return BrandProfileOut(
        tone=profile.tone,
        audience=profile.audience,
        taboos=profile.taboos,
        structure_notes=profile.structure_notes,
    )
