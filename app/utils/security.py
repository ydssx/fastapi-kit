import re
import secrets
import string
from typing import Optional

from app.core.logger import logger


def generate_random_string(length: int = 32) -> str:
    """
    生成指定长度的随机字符串
    """
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def is_strong_password(password: str, min_length: int = 8) -> tuple[bool, Optional[str]]:
    """
    检查密码强度
    返回: (是否通过, 错误信息)
    """
    if len(password) < min_length:
        return False, f"密码长度必须至少{min_length}个字符"
    
    if not re.search(r"[A-Z]", password):
        return False, "密码必须包含至少一个大写字母"
    
    if not re.search(r"[a-z]", password):
        return False, "密码必须包含至少一个小写字母"
    
    if not re.search(r"\d", password):
        return False, "密码必须包含至少一个数字"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "密码必须包含至少一个特殊字符"
    
    return True, None


def mask_sensitive_data(data: str, visible_start: int = 4, visible_end: int = 4) -> str:
    """
    对敏感数据进行掩码处理
    例如: mask_sensitive_data("1234567890") -> "1234******7890"
    """
    if not data:
        return data
    
    length = len(data)
    if length <= visible_start + visible_end:
        return "*" * length
    
    masked_length = length - visible_start - visible_end
    return data[:visible_start] + "*" * masked_length + data[-visible_end:]


def is_valid_email(email: str) -> bool:
    """
    验证邮箱格式是否正确
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def sanitize_filename(filename: str) -> str:
    """
    清理文件名，移除不安全的字符
    """
    # 移除路径分隔符和常见的不安全字符
    unsafe_chars = ['/', '\\', '..', ';', '&', '|', '*', '?', '~', '<', '>', '^', '"', "'"]
    safe_filename = filename
    
    for char in unsafe_chars:
        safe_filename = safe_filename.replace(char, '_')
    
    # 确保文件名不以点开头（防止隐藏文件）
    if safe_filename.startswith('.'):
        safe_filename = '_' + safe_filename
    
    return safe_filename
