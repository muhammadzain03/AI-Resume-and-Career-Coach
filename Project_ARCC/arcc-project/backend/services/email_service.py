import logging
from flask_mail import Mail, Message
from config import Config

logger = logging.getLogger(__name__)

mail = Mail()


def init_mail(app):
    app.config.update(
        MAIL_SERVER=Config.MAIL_SERVER,
        MAIL_PORT=Config.MAIL_PORT,
        MAIL_USE_TLS=Config.MAIL_USE_TLS,
        MAIL_USE_SSL=Config.MAIL_USE_SSL,
        MAIL_USERNAME=Config.MAIL_USERNAME,
        MAIL_PASSWORD=Config.MAIL_PASSWORD,
        MAIL_DEFAULT_SENDER=Config.MAIL_DEFAULT_SENDER or Config.MAIL_USERNAME,
    )
    mail.init_app(app)


def send_verification_email(to_email, name, token):
    verify_url = f"{Config.FRONTEND_URL}/verify-email?token={token}"
    display_name = name or to_email.split("@")[0]
    subject = "Verify your RCC account"
    body = (
        f"Hi {display_name},\n\n"
        f"Thanks for signing up for RCC. Please verify your email by opening this link:\n\n"
        f"{verify_url}\n\n"
        f"If you did not create this account, you can ignore this message.\n"
    )
    html = (
        f"<p>Hi {display_name},</p>"
        f"<p>Thanks for signing up for RCC. "
        f'<a href="{verify_url}">Click here to verify your email</a>.</p>'
        f"<p>If you did not create this account, you can ignore this message.</p>"
    )

    if not Config.mail_configured():
        logger.warning(
            "Mail not configured - verification link for %s: %s", to_email, verify_url
        )
        return False

    try:
        msg = Message(subject=subject, recipients=[to_email], body=body, html=html)
        mail.send(msg)
        return True
    except Exception:
        logger.exception("Failed to send verification email to %s", to_email)
        return False


def send_welcome_email(to_email, name):
    display_name = name or to_email.split("@")[0]
    subject = "Welcome to RCC"
    body = (
        f"Hi {display_name},\n\n"
        f"Your RCC account is ready. Open the dashboard at {Config.FRONTEND_URL}/app\n"
    )

    if not Config.mail_configured():
        logger.info("Welcome email skipped (mail not configured) for %s", to_email)
        return False

    try:
        msg = Message(subject=subject, recipients=[to_email], body=body)
        mail.send(msg)
        return True
    except Exception:
        logger.exception("Failed to send welcome email to %s", to_email)
        return False
