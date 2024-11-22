import html
import re
import unicodedata
from datetime import datetime
from typing import List, Optional


def slugify(text: str) -> str:
    """
    将文本转换为URL友好的格式
    例如: "Hello World!" -> "hello-world"
    """
    # 转换为小写并去除重音符号
    text = text.lower()
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    
    # 替换空白字符为连字符
    text = re.sub(r'[\s\-]+', '-', text)
    
    # 移除非字母数字的字符
    text = re.sub(r'[^\w\-]', '', text)
    
    # 移除开头和结尾的连字符
    return text.strip('-')


def truncate(text: str, length: int, suffix: str = "...") -> str:
    """
    截断文本，保持完整的单词
    """
    if len(text) <= length:
        return text
        
    truncated = text[:length].rsplit(' ', 1)[0]
    return truncated + suffix


def extract_urls(text: str) -> List[str]:
    """
    从文本中提取URL
    """
    url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
    return re.findall(url_pattern, text)


def remove_html_tags(text: str) -> str:
    """
    移除HTML标签，保留文本内容
    """
    # 首先进行HTML转义
    text = html.unescape(text)
    # 移除HTML标签
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)


def format_number(number: float, decimal_places: int = 2) -> str:
    """
    格式化数字，添加千位分隔符
    例如: 1234567.89 -> 1,234,567.89
    """
    return f"{number:,.{decimal_places}f}"


def extract_mentions(text: str) -> List[str]:
    """
    提取文本中的@提及
    例如: "Hello @user1 and @user2" -> ["user1", "user2"]
    """
    return re.findall(r'@(\w+)', text)


def extract_hashtags(text: str) -> List[str]:
    """
    提取文本中的#标签
    例如: "Hello #world and #python" -> ["world", "python"]
    """
    return re.findall(r'#(\w+)', text)


def count_words(text: str) -> int:
    """
    计算文本中的单词数量
    """
    # 移除多余的空白字符
    text = re.sub(r'\s+', ' ', text).strip()
    # 分割并计数
    return len(text.split()) if text else 0


def generate_excerpt(text: str, max_words: int = 50) -> str:
    """
    生成文本摘要
    """
    words = text.split()
    if len(words) <= max_words:
        return text
    
    excerpt = ' '.join(words[:max_words])
    return excerpt + "..."


def normalize_whitespace(text: str) -> str:
    """
    规范化空白字符
    - 将多个空白字符替换为单个空格
    - 移除开头和结尾的空白字符
    """
    return ' '.join(text.split())


def is_chinese(text: str) -> bool:
    """
    检查文本是否包含中文字符
    """
    for char in text:
        if '\u4e00' <= char <= '\u9fff':
            return True
    return False


def format_file_size(size_in_bytes: int) -> str:
    """
    格式化文件大小
    例如: 1234567 -> "1.18 MB"
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_in_bytes < 1024:
            return f"{size_in_bytes:.2f} {unit}"
        size_in_bytes /= 1024
    return f"{size_in_bytes:.2f} PB"
