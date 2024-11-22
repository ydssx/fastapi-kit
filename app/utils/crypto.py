import base64
import hashlib
import hmac
import secrets
from typing import Tuple

from cryptography.fernet import Fernet

from app.core.logger import logger


def generate_key() -> bytes:
    """
    生成Fernet加密密钥
    """
    return Fernet.generate_key()


def encrypt_text(text: str, key: bytes) -> str:
    """
    使用Fernet对文本进行加密
    """
    try:
        f = Fernet(key)
        encrypted_data = f.encrypt(text.encode())
        return base64.urlsafe_b64encode(encrypted_data).decode()
    except Exception as e:
        logger.error(f"Encryption error: {str(e)}")
        raise


def decrypt_text(encrypted_text: str, key: bytes) -> str:
    """
    使用Fernet对文本进行解密
    """
    try:
        f = Fernet(key)
        decrypted_data = f.decrypt(base64.urlsafe_b64decode(encrypted_text))
        return decrypted_data.decode()
    except Exception as e:
        logger.error(f"Decryption error: {str(e)}")
        raise


def hash_text(text: str, salt: str = None) -> Tuple[str, str]:
    """
    对文本进行加盐哈希
    返回: (哈希值, 盐值)
    """
    if salt is None:
        salt = secrets.token_hex(16)

    salted = text + salt
    hashed = hashlib.sha256(salted.encode()).hexdigest()
    return hashed, salt


def verify_hash(text: str, hashed: str, salt: str) -> bool:
    """
    验证文本的哈希值是否匹配
    """
    new_hash, _ = hash_text(text, salt)
    return new_hash == hashed


def generate_hmac(message: str, key: str, algorithm: str = "sha256") -> str:
    """
    生成HMAC签名
    """
    try:
        hash_obj = getattr(hashlib, algorithm)
        hmac_obj = hmac.new(key.encode(), message.encode(), hash_obj)
        return hmac_obj.hexdigest()
    except Exception as e:
        logger.error(f"HMAC generation error: {str(e)}")
        raise


def verify_hmac(
    message: str, signature: str, key: str, algorithm: str = "sha256"
) -> bool:
    """
    验证HMAC签名
    """
    try:
        expected_signature = generate_hmac(message, key, algorithm)
        return hmac.compare_digest(signature, expected_signature)
    except Exception as e:
        logger.error(f"HMAC verification error: {str(e)}")
        return False


def encode_base64(data: str) -> str:
    """
    Base64编码
    """
    try:
        return base64.b64encode(data.encode()).decode()
    except Exception as e:
        logger.error(f"Base64 encoding error: {str(e)}")
        raise


def decode_base64(encoded_data: str) -> str:
    """
    Base64解码
    """
    try:
        return base64.b64decode(encoded_data).decode()
    except Exception as e:
        logger.error(f"Base64 decoding error: {str(e)}")
        raise


def generate_random_bytes(length: int = 32) -> bytes:
    """
    生成指定长度的随机字节
    """
    return secrets.token_bytes(length)


def xor_bytes(data1: bytes, data2: bytes) -> bytes:
    """
    对两个字节序列进行异或操作
    """
    return bytes(a ^ b for a, b in zip(data1, data2))
