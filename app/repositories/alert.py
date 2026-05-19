from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert_delivery import AlertDelivery
from app.models.alert_settings import SETTINGS_ROW_ID, AlertSettings


class AlertSettingsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create(self) -> AlertSettings:
        row = await self.session.get(AlertSettings, SETTINGS_ROW_ID)
        if row is None:
            row = AlertSettings(id=SETTINGS_ROW_ID)
            self.session.add(row)
            await self.session.flush()
        return row

    async def update(self, row: AlertSettings) -> AlertSettings:
        await self.session.flush()
        await self.session.refresh(row)
        return row


class AlertDeliveryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, delivery: AlertDelivery) -> AlertDelivery:
        self.session.add(delivery)
        await self.session.flush()
        await self.session.refresh(delivery)
        return delivery

    async def list_paginated(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AlertDelivery], int]:
        query = select(AlertDelivery).order_by(AlertDelivery.created_at.desc())
        count_query = select(func.count()).select_from(AlertDelivery)
        total = int((await self.session.scalar(count_query)) or 0)
        offset = (page - 1) * page_size
        result = await self.session.scalars(query.offset(offset).limit(page_size))
        return list(result.all()), total
