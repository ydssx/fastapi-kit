import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.api.v1.creator.deps import CreatorAiSvc
from app.schemas.common import ApiResponse
from app.schemas.creator import AiSuggestIn, AiSuggestOut

router = APIRouter()


@router.post(
    "/projects/{project_id}/steps/{step_key}/ai-suggest",
    response_model=ApiResponse[AiSuggestOut],
)
async def ai_suggest(
    user: CurrentUser,
    ai: CreatorAiSvc,
    project_id: uuid.UUID,
    step_key: str,
    body: AiSuggestIn | None = None,
) -> ApiResponse[AiSuggestOut]:
    adjustment = body.adjustment if body else None
    data = await ai.suggest(user, project_id, step_key, adjustment)
    return ApiResponse(data=data)
