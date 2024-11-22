from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.core.logger import logger
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.item import Item, ItemCreate, ItemUpdate
from app.services.item_service import ItemService

router = APIRouter(prefix="/items")
item_service = ItemService()

@router.get("/", response_model=List[Item])
async def read_items(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """
    获取项目列表
    """
    items = await item_service.get_items(skip=skip, limit=limit)
    return items

@router.get("/my", response_model=List[Item])
async def read_my_items(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """
    获取当前用户的项目列表
    """
    items = await item_service.get_user_items(
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    return items

@router.post("/", response_model=Item)
async def create_item(
    item: ItemCreate,
    current_user: User = Depends(get_current_user)
):
    """
    创建新项目
    """
    db_item = await item_service.create_item(item=item, owner_id=current_user.id)
    if not db_item:
        raise HTTPException(status_code=400, detail="Failed to create item")
    return db_item

@router.get("/{item_id}", response_model=Item)
async def read_item(
    item_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    获取特定项目
    """
    items = await item_service.get_user_items(user_id=current_user.id)
    item = next((item for item in items if item.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.put("/{item_id}", response_model=Item)
async def update_item(
    item_id: int,
    item: ItemUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    更新项目
    """
    updated_item = await item_service.update_item(
        item_id=item_id,
        item_update=item,
        owner_id=current_user.id
    )
    if not updated_item:
        raise HTTPException(status_code=404, detail="Item not found or not owned by user")
    return updated_item

@router.delete("/{item_id}")
async def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    删除项目
    """
    success = await item_service.delete_item(item_id=item_id, owner_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Item not found or not owned by user")
    return {"message": "Item deleted successfully"}
