import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import ApiResponse
from app.schemas.creator import AiSuggestOut
from app.services.creator_ai import CreatorAiService

router = APIRouter()


@router.post(
    "/projects/{project_id}/steps/{step_key}/ai-suggest",
    response_model=ApiResponse[AiSuggestOut],
)
async def ai_suggest(
    user: CurrentUser,
    db: DbSession,
    project_id: uuid.UUID,
    step_key: str,
) -> ApiResponse[AiSuggestOut]:
    data = await CreatorAiService(db).suggest(user, project_id, step_key)
    return ApiResponse(data=data)
