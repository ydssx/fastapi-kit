from fastapi import APIRouter

from app.api.v1 import auth, health
from app.api.v1.admin import admin_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
