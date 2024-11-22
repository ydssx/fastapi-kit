from datetime import datetime, timedelta, timezone
from typing import Optional


def now() -> datetime:
    """
    获取当前UTC时间
    """
    return datetime.now(timezone.utc)


def format_datetime(dt: datetime, format: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    格式化日期时间
    """
    return dt.strftime(format)


def parse_datetime(date_str: str, format: str = "%Y-%m-%d %H:%M:%S") -> Optional[datetime]:
    """
    解析日期时间字符串
    """
    try:
        return datetime.strptime(date_str, format)
    except ValueError:
        return None


def add_timezone(dt: datetime) -> datetime:
    """
    为datetime添加时区信息（UTC）
    """
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def time_since(dt: datetime) -> str:
    """
    计算从给定时间到现在经过的时间，返回人类可读的字符串
    例如：2小时前，3天前
    """
    now_utc = now()
    dt = add_timezone(dt)
    diff = now_utc - dt

    seconds = diff.total_seconds()
    if seconds < 60:
        return "刚刚"
    
    minutes = seconds / 60
    if minutes < 60:
        return f"{int(minutes)}分钟前"
    
    hours = minutes / 60
    if hours < 24:
        return f"{int(hours)}小时前"
    
    days = hours / 24
    if days < 30:
        return f"{int(days)}天前"
    
    months = days / 30
    if months < 12:
        return f"{int(months)}个月前"
    
    years = days / 365
    return f"{int(years)}年前"
