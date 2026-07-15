import uuid
from collections.abc import AsyncIterable

from fastapi import APIRouter, File, Form, Query, UploadFile

from app.api.deps import CurrentUser
from app.api.v1.creator.deps import CreatorImageGenerationSvc, CreatorMediaSvc
from app.schemas.common import ApiResponse
from app.schemas.creator import (
    CreatorImageGenerationIn,
    CreatorMediaAssetListOut,
    CreatorMediaAssetOut,
    CreatorMediaAssetUpdate,
    CreatorMediaAssociationCreate,
    CreatorMediaAssociationOut,
    CreatorMediaImportIn,
    CreatorMediaPreviewOut,
    CreatorProjectMediaAssociationOut,
)

router = APIRouter()


async def _upload_chunks(file: UploadFile) -> AsyncIterable[bytes]:
    while chunk := await file.read(64 * 1024):
        yield chunk


@router.post("/media/upload", response_model=ApiResponse[CreatorMediaAssetOut], status_code=201)
async def upload_media(
    user: CurrentUser,
    media: CreatorMediaSvc,
    file: UploadFile = File(...),
    category: str = Form(..., min_length=1, max_length=50),
    tags: list[str] = Form(default=[]),
) -> ApiResponse[CreatorMediaAssetOut]:
    asset = await media.upload(
        user_id=user.id,
        content=_upload_chunks(file),
        filename=file.filename or "upload",
        declared_mime_type=file.content_type,
        category=category,
        tags=tags,
    )
    return ApiResponse(data=media.to_asset_out(asset))


@router.post("/media/import", response_model=ApiResponse[CreatorMediaAssetOut], status_code=201)
async def import_media(
    user: CurrentUser,
    media: CreatorMediaSvc,
    payload: CreatorMediaImportIn,
) -> ApiResponse[CreatorMediaAssetOut]:
    asset = await media.import_url(user_id=user.id, **payload.model_dump())
    return ApiResponse(data=media.to_asset_out(asset))


@router.post("/media/generate", response_model=ApiResponse[CreatorMediaAssetOut], status_code=202)
async def generate_media(
    user: CurrentUser,
    images: CreatorImageGenerationSvc,
    media: CreatorMediaSvc,
    payload: CreatorImageGenerationIn,
) -> ApiResponse[CreatorMediaAssetOut]:
    asset = await images.request_generation(
        user_id=user.id,
        **payload.model_dump(),
    )
    return ApiResponse(data=media.to_asset_out(asset))


@router.get("/media", response_model=ApiResponse[CreatorMediaAssetListOut])
async def list_media(
    user: CurrentUser,
    media: CreatorMediaSvc,
    category: str | None = Query(default=None, max_length=50),
    tags: list[str] | None = Query(default=None),
    keyword: str | None = Query(default=None, max_length=500),
    status: str | None = Query(default=None, max_length=30),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> ApiResponse[CreatorMediaAssetListOut]:
    assets, total = await media.list_assets(
        user_id=user.id,
        category=category,
        tags=tags,
        keyword=keyword,
        status=status,
        page=page,
        page_size=page_size,
    )
    return ApiResponse(
        data=CreatorMediaAssetListOut(
            items=[media.to_asset_out(asset) for asset in assets],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@router.get(
    "/projects/{project_id}/media-associations",
    response_model=ApiResponse[list[CreatorProjectMediaAssociationOut]],
)
async def list_project_media_associations(
    user: CurrentUser,
    media: CreatorMediaSvc,
    project_id: uuid.UUID,
) -> ApiResponse[list[CreatorProjectMediaAssociationOut]]:
    associations = await media.list_project_associations(
        user_id=user.id,
        project_id=project_id,
    )
    return ApiResponse(
        data=[
            media.to_project_association_out(association, asset)
            for association, asset in associations
        ]
    )


@router.get("/media/{asset_id}", response_model=ApiResponse[CreatorMediaAssetOut])
async def get_media(
    user: CurrentUser,
    media: CreatorMediaSvc,
    asset_id: uuid.UUID,
) -> ApiResponse[CreatorMediaAssetOut]:
    asset = await media.get(user_id=user.id, asset_id=asset_id)
    return ApiResponse(data=media.to_asset_out(asset))


@router.patch("/media/{asset_id}", response_model=ApiResponse[CreatorMediaAssetOut])
async def update_media(
    user: CurrentUser,
    media: CreatorMediaSvc,
    asset_id: uuid.UUID,
    payload: CreatorMediaAssetUpdate,
) -> ApiResponse[CreatorMediaAssetOut]:
    asset = await media.update_metadata(
        user_id=user.id,
        asset_id=asset_id,
        **payload.model_dump(),
    )
    return ApiResponse(data=media.to_asset_out(asset))


@router.delete("/media/{asset_id}", status_code=204)
async def delete_media(
    user: CurrentUser,
    media: CreatorMediaSvc,
    asset_id: uuid.UUID,
) -> None:
    await media.delete(user_id=user.id, asset_id=asset_id)


@router.get("/media/{asset_id}/preview", response_model=ApiResponse[CreatorMediaPreviewOut])
async def preview_media(
    user: CurrentUser,
    media: CreatorMediaSvc,
    asset_id: uuid.UUID,
) -> ApiResponse[CreatorMediaPreviewOut]:
    url = await media.preview_url(user_id=user.id, asset_id=asset_id)
    return ApiResponse(data=CreatorMediaPreviewOut(url=url))


@router.post(
    "/media/{asset_id}/associations",
    response_model=ApiResponse[CreatorMediaAssociationOut],
    status_code=201,
)
async def associate_media(
    user: CurrentUser,
    media: CreatorMediaSvc,
    asset_id: uuid.UUID,
    payload: CreatorMediaAssociationCreate,
) -> ApiResponse[CreatorMediaAssociationOut]:
    association = await media.associate(
        user_id=user.id,
        asset_id=asset_id,
        **payload.model_dump(),
    )
    return ApiResponse(data=media.to_association_out(association))


@router.delete("/media/{asset_id}/associations/{association_id}", status_code=204)
async def disassociate_media(
    user: CurrentUser,
    media: CreatorMediaSvc,
    asset_id: uuid.UUID,
    association_id: uuid.UUID,
) -> None:
    await media.disassociate(
        user_id=user.id,
        asset_id=asset_id,
        association_id=association_id,
    )
