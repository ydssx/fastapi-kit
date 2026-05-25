import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ApiResponse
from app.schemas.creator import (
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    PublishChecklistItemOut,
    PublishChecklistUpdate,
    StepArtifactOut,
    StepDraftUpdate,
)
from app.services.creator_project import CreatorProjectService

router = APIRouter()


@router.post("/projects", response_model=ApiResponse[ProjectOut], status_code=201)
async def create_project(
    user: CurrentUser,
    db: DbSession,
    payload: ProjectCreate,
) -> ApiResponse[ProjectOut]:
    data = await CreatorProjectService(db).create_project(user, payload)
    return ApiResponse(data=data)


@router.get("/projects", response_model=ApiResponse[list[ProjectOut]])
async def list_projects(
    user: CurrentUser,
    db: DbSession,
) -> ApiResponse[list[ProjectOut]]:
    data = await CreatorProjectService(db).list_projects(user)
    return ApiResponse(data=data)


@router.get("/projects/{project_id}", response_model=ApiResponse[ProjectOut])
async def get_project(
    user: CurrentUser,
    db: DbSession,
    project_id: uuid.UUID,
) -> ApiResponse[ProjectOut]:
    data = await CreatorProjectService(db).get_project(user, project_id)
    return ApiResponse(data=data)


@router.patch("/projects/{project_id}", response_model=ApiResponse[ProjectOut])
async def update_project(
    user: CurrentUser,
    db: DbSession,
    project_id: uuid.UUID,
    payload: ProjectUpdate,
) -> ApiResponse[ProjectOut]:
    data = await CreatorProjectService(db).update_project(user, project_id, payload)
    return ApiResponse(data=data)


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    user: CurrentUser,
    db: DbSession,
    project_id: uuid.UUID,
) -> None:
    await CreatorProjectService(db).delete_project(user, project_id)


@router.patch(
    "/projects/{project_id}/steps/{step_key}",
    response_model=ApiResponse[ProjectOut],
)
async def save_step_draft(
    user: CurrentUser,
    db: DbSession,
    project_id: uuid.UUID,
    step_key: str,
    payload: StepDraftUpdate,
) -> ApiResponse[ProjectOut]:
    data = await CreatorProjectService(db).save_draft(user, project_id, step_key, payload.content)
    return ApiResponse(data=data)


@router.post(
    "/projects/{project_id}/steps/{step_key}/confirm",
    response_model=ApiResponse[ProjectOut],
)
async def confirm_step(
    user: CurrentUser,
    db: DbSession,
    project_id: uuid.UUID,
    step_key: str,
    payload: StepDraftUpdate | None = None,
) -> ApiResponse[ProjectOut]:
    content = payload.content if payload else None
    data = await CreatorProjectService(db).confirm_step(user, project_id, step_key, content)
    return ApiResponse(data=data)


@router.post(
    "/projects/{project_id}/steps/{step_key}/open",
    response_model=ApiResponse[ProjectOut],
)
async def open_step(
    user: CurrentUser,
    db: DbSession,
    project_id: uuid.UUID,
    step_key: str,
) -> ApiResponse[ProjectOut]:
    data = await CreatorProjectService(db).open_step(user, project_id, step_key)
    return ApiResponse(data=data)


@router.get(
    "/projects/{project_id}/artifacts",
    response_model=ApiResponse[list[StepArtifactOut]],
)
async def list_artifacts(
    user: CurrentUser,
    db: DbSession,
    project_id: uuid.UUID,
) -> ApiResponse[list[StepArtifactOut]]:
    data = await CreatorProjectService(db).list_artifacts(user, project_id)
    return ApiResponse(data=data)


@router.get(
    "/projects/{project_id}/publish-checklist",
    response_model=ApiResponse[list[PublishChecklistItemOut]],
)
async def get_publish_checklist(
    user: CurrentUser,
    db: DbSession,
    project_id: uuid.UUID,
) -> ApiResponse[list[PublishChecklistItemOut]]:
    data = await CreatorProjectService(db).get_publish_checklist(user, project_id)
    return ApiResponse(data=data)


@router.patch(
    "/projects/{project_id}/publish-checklist",
    response_model=ApiResponse[list[PublishChecklistItemOut]],
)
async def update_publish_checklist(
    user: CurrentUser,
    db: DbSession,
    project_id: uuid.UUID,
    payload: PublishChecklistUpdate,
) -> ApiResponse[list[PublishChecklistItemOut]]:
    data = await CreatorProjectService(db).update_publish_checklist(user, project_id, payload)
    return ApiResponse(data=data)


@router.post(
    "/projects/{project_id}/complete",
    response_model=ApiResponse[ProjectOut],
)
async def complete_project(
    user: CurrentUser,
    db: DbSession,
    project_id: uuid.UUID,
) -> ApiResponse[ProjectOut]:
    data = await CreatorProjectService(db).complete_project(user, project_id)
    return ApiResponse(data=data)
