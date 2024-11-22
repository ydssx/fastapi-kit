from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from app.core.database import Base

# 角色-权限关联表
role_permission = Table(
    'role_permission',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id')),
    Column('permission_id', Integer, ForeignKey('permissions.id'))
)

# 用户-角色关联表
user_role = Table(
    'user_role',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('role_id', Integer, ForeignKey('roles.id'))
)

class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    
    # 关系
    permissions = relationship(
        "Permission",
        secondary=role_permission,
        back_populates="roles"
    )
    users = relationship(
        "User",
        secondary=user_role,
        back_populates="roles"
    )

class Permission(Base):
    __tablename__ = 'permissions'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    resource = Column(String)  # 资源类型，如 'users', 'items' 等
    action = Column(String)    # 操作类型，如 'create', 'read', 'update', 'delete'
    
    # 关系
    roles = relationship(
        "Role",
        secondary=role_permission,
        back_populates="permissions"
    )

    def __str__(self):
        return f"{self.action}:{self.resource}"
