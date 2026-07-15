import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.api.v1.creator.deps import (
    CreatorProjectSvc,
    CreatorPublishSvc,
    CreatorStepSvc,
)
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

router = APIRouter()


@router.post("/projects", response_model=ApiResponse[ProjectOut], status_code=201)
async def create_project(
    user: CurrentUser,
    projects: CreatorProjectSvc,
    payload: ProjectCreate,
) -> ApiResponse[ProjectOut]:
    data = await projects.create_project(user, payload)
    return ApiResponse(data=data)


@router.get("/projects", response_model=ApiResponse[list[ProjectOut]])
async def list_projects(
    user: CurrentUser,
    projects: CreatorProjectSvc,
) -> ApiResponse[list[ProjectOut]]:
    data = await projects.list_projects(user)
    return ApiResponse(data=data)


@router.get("/projects/{project_id}", response_model=ApiResponse[ProjectOut])
async def get_project(
    user: CurrentUser,
    projects: CreatorProjectSvc,
    project_id: uuid.UUID,
) -> ApiResponse[ProjectOut]:
    data = await projects.get_project(user, project_id)
    return ApiResponse(data=data)


@router.patch("/projects/{project_id}", response_model=ApiResponse[ProjectOut])
async def update_project(
    user: CurrentUser,
    projects: CreatorProjectSvc,
    project_id: uuid.UUID,
    payload: ProjectUpdate,
) -> ApiResponse[ProjectOut]:
    data = await projects.update_project(user, project_id, payload)
    return ApiResponse(data=data)


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    user: CurrentUser,
    projects: CreatorProjectSvc,
    project_id: uuid.UUID,
) -> None:
    await projects.delete_project(user, project_id)


@router.patch(
    "/projects/{project_id}/steps/{step_key}",
    response_model=ApiResponse[ProjectOut],
)
async def save_step_draft(
    user: CurrentUser,
    steps: CreatorStepSvc,
    project_id: uuid.UUID,
    step_key: str,
    payload: StepDraftUpdate,
) -> ApiResponse[ProjectOut]:
    data = await steps.save_draft(user, project_id, step_key, payload.content)
    return ApiResponse(data=data)


@router.post(
    "/projects/{project_id}/steps/{step_key}/confirm",
    response_model=ApiResponse[ProjectOut],
)
async def confirm_step(
    user: CurrentUser,
    steps: CreatorStepSvc,
    project_id: uuid.UUID,
    step_key: str,
    payload: StepDraftUpdate | None = None,
) -> ApiResponse[ProjectOut]:
    content = payload.content if payload else None
    data = await steps.confirm_step(user, project_id, step_key, content)
    return ApiResponse(data=data)


@router.post(
    "/projects/{project_id}/steps/{step_key}/open",
    response_model=ApiResponse[ProjectOut],
)
async def open_step(
    user: CurrentUser,
    steps: CreatorStepSvc,
    project_id: uuid.UUID,
    step_key: str,
) -> ApiResponse[ProjectOut]:
    data = await steps.open_step(user, project_id, step_key)
    return ApiResponse(data=data)


@router.get(
    "/projects/{project_id}/artifacts",
    response_model=ApiResponse[list[StepArtifactOut]],
)
async def list_artifacts(
    user: CurrentUser,
    steps: CreatorStepSvc,
    project_id: uuid.UUID,
) -> ApiResponse[list[StepArtifactOut]]:
    data = await steps.list_artifacts(user, project_id)
    return ApiResponse(data=data)


@router.get(
    "/projects/{project_id}/publish-checklist",
    response_model=ApiResponse[list[PublishChecklistItemOut]],
)
async def get_publish_checklist(
    user: CurrentUser,
    publish: CreatorPublishSvc,
    project_id: uuid.UUID,
) -> ApiResponse[list[PublishChecklistItemOut]]:
    data = await publish.get_publish_checklist(user, project_id)
    return ApiResponse(data=data)


@router.patch(
    "/projects/{project_id}/publish-checklist",
    response_model=ApiResponse[list[PublishChecklistItemOut]],
)
async def update_publish_checklist(
    user: CurrentUser,
    publish: CreatorPublishSvc,
    project_id: uuid.UUID,
    payload: PublishChecklistUpdate,
) -> ApiResponse[list[PublishChecklistItemOut]]:
    data = await publish.update_publish_checklist(user, project_id, payload)
    return ApiResponse(data=data)


@router.post(
    "/projects/{project_id}/complete",
    response_model=ApiResponse[ProjectOut],
)
async def complete_project(
    user: CurrentUser,
    publish: CreatorPublishSvc,
    project_id: uuid.UUID,
) -> ApiResponse[ProjectOut]:
    data = await publish.complete_project(user, project_id)
    return ApiResponse(data=data)
