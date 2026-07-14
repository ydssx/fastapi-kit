import asyncio
import smtplib
from email.message import EmailMessage

from app.core.config import Settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _send_smtp_message(
    settings: Settings,
    *,
    to_email: str,
    subject: str,
    body: str,
) -> None:
    if not settings.smtp_host:
        raise RuntimeError("SMTP host is not configured")

    message = EmailMessage()
    message["From"] = settings.smtp_from or ""
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)


async def send_password_reset_email(
    settings: Settings,
    *,
    to_email: str,
    reset_url: str,
) -> None:
    subject = f"{settings.app_name} 密码重置"
    body = (
        "你收到这封邮件是因为有人请求重置创作者工作台密码。\n\n"
        f"请在 {settings.password_reset_expire_minutes} 分钟内打开以下链接设置新密码：\n"
        f"{reset_url}\n\n"
        "如非本人操作，请忽略此邮件。"
    )
    await asyncio.to_thread(
        _send_smtp_message,
        settings,
        to_email=to_email,
        subject=subject,
        body=body,
    )
    logger.info("password_reset_email_sent", to_email=to_email)
