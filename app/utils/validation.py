import re
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel

from app.core.logger import logger


def validate_phone_number(phone: str, country_code: str = "CN") -> bool:
    """
    验证手机号码格式
    目前支持：
    - CN: 中国大陆 (1[3-9]\d{9})
    - HK: 香港 ([5-9]\d{7})
    - TW: 台湾 (09\d{8})
    """
    patterns = {
        "CN": r"^1[3-9]\d{9}$",
        "HK": r"^[5-9]\d{7}$",
        "TW": r"^09\d{8}$"
    }
    
    pattern = patterns.get(country_code.upper())
    if not pattern:
        logger.warning(f"Unsupported country code: {country_code}")
        return False
    
    return bool(re.match(pattern, phone))


def validate_id_card(id_card: str) -> tuple[bool, Optional[str]]:
    """
    验证中国大陆身份证号码
    返回: (是否有效, 错误信息)
    """
    if not re.match(r"^\d{17}[\dX]$", id_card):
        return False, "身份证号码格式不正确"

    # 验证出生日期
    try:
        birth = datetime.strptime(id_card[6:14], "%Y%m%d")
        if birth > datetime.now():
            return False, "出生日期不能大于当前日期"
    except ValueError:
        return False, "出生日期无效"

    # 验证校验码
    factors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    checksum_map = {0: '1', 1: '0', 2: 'X', 3: '9', 4: '8', 
                   5: '7', 6: '6', 7: '5', 8: '4', 9: '3', 10: '2'}
    
    checksum = sum(int(id_card[i]) * factors[i] for i in range(17)) % 11
    if id_card[-1].upper() != checksum_map[checksum]:
        return False, "校验码错误"

    return True, None


def validate_credit_card(number: str) -> bool:
    """
    使用Luhn算法验证信用卡号
    """
    if not number.isdigit():
        return False
        
    digits = [int(d) for d in number]
    checksum = 0
    is_even = len(digits) % 2 == 0
    
    for i, digit in enumerate(digits):
        if (i % 2 == 0) == is_even:
            doubled = digit * 2
            checksum += doubled if doubled < 10 else doubled - 9
        else:
            checksum += digit
    
    return checksum % 10 == 0


def validate_model_data(model: BaseModel, data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    验证数据是否符合Pydantic模型的要求
    返回: (是否有效, 错误信息)
    """
    try:
        model.model_validate(data)
        return True, None
    except Exception as e:
        return False, str(e)


def validate_url(url: str) -> bool:
    """
    验证URL格式是否正确
    支持http、https协议
    """
    pattern = (
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
        r'localhost|'  # localhost
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$'  # path
    )
    return bool(re.match(pattern, url, re.IGNORECASE))


def validate_password_strength(password: str) -> Dict[str, Any]:
    """
    详细评估密码强度
    返回包含各项指标的字典
    """
    result = {
        "length": len(password) >= 8,
        "uppercase": bool(re.search(r"[A-Z]", password)),
        "lowercase": bool(re.search(r"[a-z]", password)),
        "digits": bool(re.search(r"\d", password)),
        "special_chars": bool(re.search(r"[!@#$%^&*(),.?\":{}|<>]", password)),
        "score": 0,
        "strength": "弱"
    }
    
    # 计算得分
    score = 0
    score += 1 if result["length"] else 0
    score += 1 if result["uppercase"] else 0
    score += 1 if result["lowercase"] else 0
    score += 1 if result["digits"] else 0
    score += 1 if result["special_chars"] else 0
    
    result["score"] = score
    
    # 评估强度
    if score <= 2:
        result["strength"] = "弱"
    elif score <= 3:
        result["strength"] = "中"
    elif score <= 4:
        result["strength"] = "强"
    else:
        result["strength"] = "非常强"
    
    return result
