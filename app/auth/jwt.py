from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from jose import JWTError, jwt
from ..config import settings
from typing import Optional

class AuthHandler:
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.api_key_header = APIKeyHeader(name="X-API-Key")
        # 添加token过期时间配置
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        
    def create_token(self, user_id: str, expires_delta: Optional[timedelta] = None) -> dict:
        """创建访问令牌"""
        expire = datetime.utcnow() + (
            expires_delta or timedelta(minutes=self.access_token_expire_minutes)
        )
        payload = {
            "user_id": user_id,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access_token"
        }
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_at": expire.timestamp()
        }

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
