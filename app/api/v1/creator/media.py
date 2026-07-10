import uuid
from collections.abc import AsyncIterable

from fastapi import APIRouter, File, Form, Query, UploadFile

from app.api.deps import CurrentUser, DbSession
from app.models.creator import CreatorMediaAsset, ProjectMediaAsset
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
from app.services.creator_image_generation import CreatorImageGenerationService
from app.services.creator_media import CreatorMediaService

router = APIRouter()


def _asset_out(asset: CreatorMediaAsset) -> CreatorMediaAssetOut:
    data = CreatorMediaAssetOut.model_validate(asset, from_attributes=True)
    if asset.deleted_at is not None:
        return data.model_copy(update={"status": "deleted"})
    return data


def _association_out(association: ProjectMediaAsset) -> CreatorMediaAssociationOut:
    return CreatorMediaAssociationOut(
        id=association.id,
        project_id=association.project_id,
        media_asset_id=association.media_asset_id,
        step_key=association.step_key,
        reference_position=association.reference_position,
        asset_reference=f"asset://{association.media_asset_id}",
        created_at=association.created_at,
    )


async def _upload_chunks(file: UploadFile) -> AsyncIterable[bytes]:
    while chunk := await file.read(64 * 1024):
        yield chunk


@router.post("/media/upload", response_model=ApiResponse[CreatorMediaAssetOut], status_code=201)
async def upload_media(
    user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
    category: str = Form(..., min_length=1, max_length=50),
    tags: list[str] = Form(default=[]),
) -> ApiResponse[CreatorMediaAssetOut]:
    asset = await CreatorMediaService(db).upload(
        user_id=user.id,
        content=_upload_chunks(file),
        filename=file.filename or "upload",
        declared_mime_type=file.content_type,
        category=category,
        tags=tags,
    )
    return ApiResponse(data=_asset_out(asset))


@router.post("/media/import", response_model=ApiResponse[CreatorMediaAssetOut], status_code=201)
async def import_media(
    user: CurrentUser,
    db: DbSession,
    payload: CreatorMediaImportIn,
) -> ApiResponse[CreatorMediaAssetOut]:
    asset = await CreatorMediaService(db).import_url(user_id=user.id, **payload.model_dump())
    return ApiResponse(data=_asset_out(asset))


@router.post("/media/generate", response_model=ApiResponse[CreatorMediaAssetOut], status_code=202)
async def generate_media(
    user: CurrentUser,
    db: DbSession,
    payload: CreatorImageGenerationIn,
) -> ApiResponse[CreatorMediaAssetOut]:
    asset = await CreatorImageGenerationService(db).request_generation(
        user_id=user.id,
        **payload.model_dump(),
    )
    return ApiResponse(data=_asset_out(asset))


@router.get("/media", response_model=ApiResponse[CreatorMediaAssetListOut])
async def list_media(
    user: CurrentUser,
    db: DbSession,
    category: str | None = Query(default=None, max_length=50),
    tags: list[str] | None = Query(default=None),
    keyword: str | None = Query(default=None, max_length=500),
    status: str | None = Query(default=None, max_length=30),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> ApiResponse[CreatorMediaAssetListOut]:
    assets, total = await CreatorMediaService(db).list_assets(
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
            items=[_asset_out(asset) for asset in assets],
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
    db: DbSession,
    project_id: uuid.UUID,
) -> ApiResponse[list[CreatorProjectMediaAssociationOut]]:
    associations = await CreatorMediaService(db).list_project_associations(
        user_id=user.id,
        project_id=project_id,
    )
    return ApiResponse(
        data=[
            CreatorProjectMediaAssociationOut(
                **_association_out(association).model_dump(),
                asset=_asset_out(asset),
                is_invalid=asset.deleted_at is not None or asset.status != "ready",
            )
            for association, asset in associations
        ]
    )


@router.get("/media/{asset_id}", response_model=ApiResponse[CreatorMediaAssetOut])
async def get_media(
    user: CurrentUser,
    db: DbSession,
    asset_id: uuid.UUID,
) -> ApiResponse[CreatorMediaAssetOut]:
    asset = await CreatorMediaService(db).get(user_id=user.id, asset_id=asset_id)
    return ApiResponse(data=_asset_out(asset))


@router.patch("/media/{asset_id}", response_model=ApiResponse[CreatorMediaAssetOut])
async def update_media(
    user: CurrentUser,
    db: DbSession,
    asset_id: uuid.UUID,
    payload: CreatorMediaAssetUpdate,
) -> ApiResponse[CreatorMediaAssetOut]:
    asset = await CreatorMediaService(db).update_metadata(
        user_id=user.id,
        asset_id=asset_id,
        **payload.model_dump(),
    )
    return ApiResponse(data=_asset_out(asset))


@router.delete("/media/{asset_id}", status_code=204)
async def delete_media(user: CurrentUser, db: DbSession, asset_id: uuid.UUID) -> None:
    await CreatorMediaService(db).delete(user_id=user.id, asset_id=asset_id)


@router.get("/media/{asset_id}/preview", response_model=ApiResponse[CreatorMediaPreviewOut])
async def preview_media(
    user: CurrentUser,
    db: DbSession,
    asset_id: uuid.UUID,
) -> ApiResponse[CreatorMediaPreviewOut]:
    url = await CreatorMediaService(db).preview_url(user_id=user.id, asset_id=asset_id)
    return ApiResponse(data=CreatorMediaPreviewOut(url=url))


@router.post(
    "/media/{asset_id}/associations",
    response_model=ApiResponse[CreatorMediaAssociationOut],
    status_code=201,
)
async def associate_media(
    user: CurrentUser,
    db: DbSession,
    asset_id: uuid.UUID,
    payload: CreatorMediaAssociationCreate,
) -> ApiResponse[CreatorMediaAssociationOut]:
    association = await CreatorMediaService(db).associate(
        user_id=user.id,
        asset_id=asset_id,
        **payload.model_dump(),
    )
    return ApiResponse(data=_association_out(association))


@router.delete("/media/{asset_id}/associations/{association_id}", status_code=204)
async def disassociate_media(
    user: CurrentUser,
    db: DbSession,
    asset_id: uuid.UUID,
    association_id: uuid.UUID,
) -> None:
    await CreatorMediaService(db).disassociate(
        user_id=user.id,
        asset_id=asset_id,
        association_id=association_id,
    )
