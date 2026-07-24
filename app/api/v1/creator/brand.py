from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.api.v1.creator.deps import CreatorBrandSvc
from app.schemas.common import ApiResponse
from app.schemas.creator import BrandProfileOut, BrandProfileUpdate

router = APIRouter()


@router.get("/brand-profile", response_model=ApiResponse[BrandProfileOut])
async def get_brand_profile(
    user: CurrentUser,
    brand: CreatorBrandSvc,
) -> ApiResponse[BrandProfileOut]:
    data = await brand.get_profile(user.id)
    return ApiResponse(data=data)


@router.put("/brand-profile", response_model=ApiResponse[BrandProfileOut])
async def update_brand_profile(
    user: CurrentUser,
    brand: CreatorBrandSvc,
    payload: BrandProfileUpdate,
) -> ApiResponse[BrandProfileOut]:
    data = await brand.update_profile(user.id, payload)
    return ApiResponse(data=data)
