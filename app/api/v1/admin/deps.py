"""Admin-facing dependencies that reuse Creator domain services without
importing the full Creator router DI graph into admin route modules.
"""

from app.api.deps import DbSession
from app.services.creator_events import CreatorEventService


def get_creator_events_for_admin(db: DbSession) -> CreatorEventService:
    return CreatorEventService(db)
