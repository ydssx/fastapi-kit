from fastapi import APIRouter

from app.api.v1.admin import alerts, audit, celery, creator_metrics, dashboard, logs, users

admin_router = APIRouter()
admin_router.include_router(users.router)
admin_router.include_router(dashboard.router)
admin_router.include_router(celery.router)
admin_router.include_router(audit.router)
admin_router.include_router(alerts.router)
admin_router.include_router(logs.router)
admin_router.include_router(creator_metrics.router)
