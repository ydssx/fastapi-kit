from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ApiResponse
from app.schemas.creator import BrandProfileOut, BrandProfileUpdate
from app.services.creator_brand import CreatorBrandService

router = APIRouter()


@router.get("/brand-profile", response_model=ApiResponse[BrandProfileOut])
async def get_brand_profile(
    user: CurrentUser,
    db: DbSession,
) -> ApiResponse[BrandProfileOut]:
    data = await CreatorBrandService(db).get_profile(user.id)
    return ApiResponse(data=data)


@router.put("/brand-profile", response_model=ApiResponse[BrandProfileOut])
async def update_brand_profile(
    user: CurrentUser,
    db: DbSession,
    payload: BrandProfileUpdate,
) -> ApiResponse[BrandProfileOut]:
    data = await CreatorBrandService(db).update_profile(user.id, payload)
    return ApiResponse(data=data)
