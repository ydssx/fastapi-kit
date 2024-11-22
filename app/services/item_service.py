from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logger import logger
from app.models.item import Item
from app.models.user import User
from app.schemas.item import ItemCreate, ItemUpdate


class ItemService:
    def __init__(self):
        self.db = next(get_db())

    async def create_item(self, item: ItemCreate, owner_id: int) -> Optional[Item]:
        """
        创建新项目
        """
        try:
            db_item = Item(**item.dict(), owner_id=owner_id)
            self.db.add(db_item)
            self.db.commit()
            self.db.refresh(db_item)
            logger.info(f"Created new item: {db_item.title}")
            return db_item
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating item: {str(e)}")
            return None

    async def get_items(self, skip: int = 0, limit: int = 100) -> List[Item]:
        """
        获取项目列表
        """
        try:
            items = self.db.query(Item).offset(skip).limit(limit).all()
            return items
        except Exception as e:
            logger.error(f"Error getting items: {str(e)}")
            return []

    async def get_user_items(
        self, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Item]:
        """
        获取用户的项目列表
        """
        try:
            items = (
                self.db.query(Item)
                .filter(Item.owner_id == user_id)
                .offset(skip)
                .limit(limit)
                .all()
            )
            return items
        except Exception as e:
            logger.error(f"Error getting items for user {user_id}: {str(e)}")
            return []

    async def update_item(
        self, item_id: int, item_update: ItemUpdate, owner_id: int
    ) -> Optional[Item]:
        """
        更新项目
        """
        try:
            db_item = (
                self.db.query(Item)
                .filter(Item.id == item_id, Item.owner_id == owner_id)
                .first()
            )
            if not db_item:
                logger.info(f"Item {item_id} not found or not owned by user {owner_id}")
                return None

            for field, value in item_update.dict(exclude_unset=True).items():
                setattr(db_item, field, value)

            self.db.commit()
            self.db.refresh(db_item)
            logger.info(f"Updated item {item_id}")
            return db_item
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating item {item_id}: {str(e)}")
            return None

    async def delete_item(self, item_id: int, owner_id: int) -> bool:
        """
        删除项目
        """
        try:
            db_item = (
                self.db.query(Item)
                .filter(Item.id == item_id, Item.owner_id == owner_id)
                .first()
            )
            if not db_item:
                logger.info(f"Item {item_id} not found or not owned by user {owner_id}")
                return False

            self.db.delete(db_item)
            self.db.commit()
            logger.info(f"Deleted item {item_id}")
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting item {item_id}: {str(e)}")
            return False
