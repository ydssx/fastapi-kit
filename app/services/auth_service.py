from typing import Optional
from fastapi import Depends, HTTPException
from fastapi.security import APIKeyHeader
from jose import JWTError, jwt
from app.core.database import get_db
from app.core.logger import logger
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.core.config import settings


class AuthService:
    def __init__(self):
        self.db = next(get_db())
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.api_key_header = APIKeyHeader(name="X-API-Key")
        # 添加token过期时间配置
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES


    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """
        验证用户凭据
        """
        try:
            user = self.db.query(User).filter(User.username == username).first()
            if not user:
                logger.info(f"User {username} not found")
                return None
            if not verify_password(password, user.password_hash):
                logger.info(f"Invalid password for user {username}")
                return None
            return user
        except Exception as e:
            logger.error(f"Error authenticating user {username}: {str(e)}")
            return None

    async def create_user(
        self, username: str, password: str, email: str
    ) -> Optional[User]:
        """
        创建新用户
        """
        try:
            user = User(
                username=username,
                password_hash=get_password_hash(password),
                email=email,
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            logger.info(f"Created new user: {username}")
            return user
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating user {username}: {str(e)}")
            return None

    async def get_current_user(
        self,
        token: str = Depends(APIKeyHeader(name="X-API-Key"))
    ) -> str:
        """获取当前用户"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id = payload.get("user_id")
            if user_id is None:
                raise HTTPException(status_code=401, detail="Invalid token claims")
            return user_id
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

    async def create_access_token(self, user_id: str) -> str|None:
        """
        生成访问令牌
        """
        try:
            payload = {
                "user_id": user_id,
                "exp": int(time.time()) + self.access_token_expire_minutes * 60,
            }
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            return token
        except Exception as e:
            logger.error(f"Error creating access token: {str(e)}")
            return None
