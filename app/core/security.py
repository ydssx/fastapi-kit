from datetime import datetime, timedelta
from hashlib import md5
from typing import List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    scopes={
        "admin": "Full access to all resources",
        "user": "Standard user access",
        "read": "Read-only access",
    },
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return md5(plain_password.encode("utf-8")).hexdigest() == hashed_password


def get_password_hash(password: str) -> str:
    """生成密码哈希"""
    return md5(password.encode("utf-8")).hexdigest()


def create_access_token(
    subject: str, scopes: List[str], expires_delta: Optional[timedelta] = None
) -> str:
    """创建访问令牌"""
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {"exp": expire, "sub": str(subject), "scopes": scopes}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


async def get_current_user(
    security_scopes: SecurityScopes,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """获取当前用户"""
    if security_scopes.scopes:
        authenticate_value = f'Bearer scope="{security_scopes.scope_str}"'
    else:
        authenticate_value = "Bearer"

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": authenticate_value},
    )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_scopes = payload.get("scopes", [])
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    # 验证作用域
    for scope in security_scopes.scopes:
        if scope not in token_scopes:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not enough permissions",
                headers={"WWW-Authenticate": authenticate_value},
            )

    return user


def check_permission(user: User, required_permission: str, db: Session) -> bool:
    """检查用户是否有特定权限"""
    # 获取用户的所有角色
    roles = user.roles

    # 如果用户有管理员角色，直接返回True
    if any(role.name == "admin" for role in roles):
        return True

    # 检查每个角色的权限
    for role in roles:
        for permission in role.permissions:
            if str(permission) == required_permission:
                return True

    return False


def require_permission(permission: str):
    """权限要求装饰器"""

    def decorator(func):
        async def wrapper(*args, **kwargs):
            # 获取当前用户和数据库会话
            user = kwargs.get("current_user")
            db = kwargs.get("db")

            if not user or not db:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required",
                )

            # 检查权限
            if not check_permission(user, permission, db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission} required",
                )

            return await func(*args, **kwargs)

        return wrapper

    return decorator
