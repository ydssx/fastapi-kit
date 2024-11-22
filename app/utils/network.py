import ipaddress
import socket
from typing import Dict, Optional, Union
from urllib.parse import urljoin, urlparse

import requests

from app.core.logger import logger


def is_valid_ip(ip: str) -> bool:
    """
    验证IP地址是否有效
    支持IPv4和IPv6
    """
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def is_valid_port(port: int) -> bool:
    """
    验证端口号是否有效
    """
    return isinstance(port, int) and 0 <= port <= 65535


def get_hostname() -> str:
    """
    获取当前主机名
    """
    return socket.gethostname()


def get_ip_address() -> str:
    """
    获取本机IP地址
    """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception as e:
        logger.error(f"Error getting IP address: {str(e)}")
        return "127.0.0.1"


def is_port_open(host: str, port: int, timeout: float = 2.0) -> bool:
    """
    检查指定主机的端口是否开放
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        logger.error(f"Error checking port {port} on {host}: {str(e)}")
        return False


def make_request(
    url: str,
    method: str = "GET",
    params: Optional[Dict] = None,
    data: Optional[Dict] = None,
    headers: Optional[Dict] = None,
    timeout: int = 30,
    verify_ssl: bool = True
) -> requests.Response:
    """
    发送HTTP请求
    """
    try:
        response = requests.request(
            method=method.upper(),
            url=url,
            params=params,
            json=data,
            headers=headers,
            timeout=timeout,
            verify=verify_ssl
        )
        response.raise_for_status()
        return response
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error for {url}: {str(e)}")
        raise


def parse_url(url: str) -> Dict[str, str]:
    """
    解析URL并返回其组成部分
    """
    parsed = urlparse(url)
    return {
        "scheme": parsed.scheme,
        "netloc": parsed.netloc,
        "path": parsed.path,
        "params": parsed.params,
        "query": parsed.query,
        "fragment": parsed.fragment
    }


def build_url(base_url: str, path: str) -> str:
    """
    构建完整的URL
    """
    return urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def get_domain_from_url(url: str) -> str:
    """
    从URL中提取域名
    """
    parsed = urlparse(url)
    return parsed.netloc


def ping(host: str, timeout: float = 2.0) -> bool:
    """
    Ping指定主机
    """
    try:
        return is_port_open(host, 80, timeout)
    except Exception as e:
        logger.error(f"Ping error for {host}: {str(e)}")
        return False


def get_network_interfaces() -> Dict[str, str]:
    """
    获取所有网络接口的IP地址
    """
    interfaces = {}
    try:
        for interface in socket.if_nameindex():
            try:
                ip = socket.gethostbyname(interface[1])
                interfaces[interface[1]] = ip
            except socket.error:
                continue
    except Exception as e:
        logger.error(f"Error getting network interfaces: {str(e)}")
    return interfaces


def is_local_address(ip: str) -> bool:
    """
    检查IP地址是否为本地地址
    """
    try:
        ip_obj = ipaddress.ip_address(ip)
        return (
            ip_obj.is_private or
            ip_obj.is_loopback or
            ip_obj.is_link_local or
            ip_obj.is_multicast
        )
    except ValueError:
        return False
