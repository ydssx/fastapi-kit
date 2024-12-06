from datetime import datetime

from sqlmodel import Field, SQLModel, func


class User(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True)
    password_hash: str = Field()
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=func.now)
    updated_at: datetime = Field(default_factory=func.now)
