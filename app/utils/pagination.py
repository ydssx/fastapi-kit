from typing import Generic, List, Optional, TypeVar

from fastapi import Query
from pydantic import BaseModel, Field

T = TypeVar("T")

class PageParams:
    def __init__(
        self,
        page: int = Query(1, ge=1, description="页码"),
        page_size: int = Query(20, ge=1, le=100, description="每页数量")
    ):
        self.page = page
        self.page_size = page_size
        self.skip = (page - 1) * page_size


class Page(BaseModel, Generic[T]):
    """
    分页响应模型
    """
    items: List[T]
    total: int
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")
    pages: int = Field(..., description="总页数")
    has_next: bool = Field(..., description="是否有下一页")
    has_prev: bool = Field(..., description="是否有上一页")
    next_page: Optional[int] = Field(None, description="下一页页码")
    prev_page: Optional[int] = Field(None, description="上一页页码")

    @classmethod
    def create(cls, items: List[T], total: int, page_params: PageParams) -> "Page[T]":
        """
        创建分页对象
        """
        pages = (total + page_params.page_size - 1) // page_params.page_size
        has_next = page_params.page < pages
        has_prev = page_params.page > 1
        
        return cls(
            items=items,
            total=total,
            page=page_params.page,
            page_size=page_params.page_size,
            pages=pages,
            has_next=has_next,
            has_prev=has_prev,
            next_page=page_params.page + 1 if has_next else None,
            prev_page=page_params.page - 1 if has_prev else None
        )
