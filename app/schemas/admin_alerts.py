import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class AlertSettingsPublic(BaseModel):
    webhook_url: str | None
    webhook_secret_configured: bool
    recovery_notifications_enabled: bool
    webhook_enabled: bool


class AlertSettingsUpdate(BaseModel):
    webhook_url: str | None = None
    webhook_secret: str | None = Field(default=None, max_length=512)
    clear_webhook_secret: bool = False
    recovery_notifications_enabled: bool | None = None


class AlertDeliveryPublic(BaseModel):
    id: uuid.UUID
    event_type: str
    success: bool
    http_status: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertTestResult(BaseModel):
    sent: bool
    http_status: int | None
    message: str
