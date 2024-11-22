from typing import Dict, List

# 预定义的角色
PREDEFINED_ROLES = {
    "admin": {
        "description": "System administrator with full access",
        "permissions": ["*:*"]  # 通配符表示所有权限
    },
    "user": {
        "description": "Standard user with limited access",
        "permissions": [
            "read:items",
            "create:items",
            "update:own_items",
            "delete:own_items",
            "read:own_profile",
            "update:own_profile"
        ]
    },
    "guest": {
        "description": "Guest user with read-only access",
        "permissions": [
            "read:public_items",
            "read:public_profiles"
        ]
    }
}

# 安全策略配置
SECURITY_CONFIG = {
    # 密码策略
    "password_policy": {
        "min_length": 8,
        "require_uppercase": True,
        "require_lowercase": True,
        "require_numbers": True,
        "require_special_chars": True,
        "max_length": 128
    },
    
    # JWT配置
    "jwt": {
        "access_token_expire_minutes": 30,
        "refresh_token_expire_days": 7,
        "algorithm": "HS256",
        "token_type": "bearer"
    },
    
    # 会话配置
    "session": {
        "max_sessions_per_user": 5,
        "session_timeout_minutes": 60,
        "remember_me_days": 30
    },
    
    # 速率限制
    "rate_limiting": {
        "default": {
            "requests_per_minute": 60,
            "burst_size": 100
        },
        "auth": {
            "requests_per_minute": 5,
            "burst_size": 10
        },
        "api": {
            "requests_per_minute": 30,
            "burst_size": 50
        }
    },
    
    # CORS配置
    "cors": {
        "allow_origins": ["*"],
        "allow_methods": ["*"],
        "allow_headers": ["*"],
        "allow_credentials": True,
        "max_age": 600
    },
    
    # 安全头部
    "security_headers": {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    },
    
    # 文件上传配置
    "file_upload": {
        "max_file_size_mb": 10,
        "allowed_extensions": [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"],
        "scan_virus": True,
        "sanitize_filenames": True
    },
    
    # 审计日志配置
    "audit_logging": {
        "enabled": True,
        "log_level": "INFO",
        "include_request_body": False,
        "include_response_body": False,
        "sensitive_fields": ["password", "token", "secret"]
    }
}

# OAuth2提供商配置
OAUTH2_PROVIDERS = {
    "google": {
        "client_id": "",  # 从环境变量获取
        "client_secret": "",  # 从环境变量获取
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scope": ["openid", "email", "profile"]
    },
    "github": {
        "client_id": "",  # 从环境变量获取
        "client_secret": "",  # 从环境变量获取
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "scope": ["read:user", "user:email"]
    }
}

def get_role_permissions(role_name: str) -> List[str]:
    """获取角色的权限列表"""
    return PREDEFINED_ROLES.get(role_name, {}).get("permissions", [])
