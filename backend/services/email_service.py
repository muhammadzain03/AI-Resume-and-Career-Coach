import logging
import threading

import requests
from flask import current_app
from flask_mail import Mail, Message

from config import Config

logger = logging.getLogger(__name__)

mail = Mail()
RESEND_API_URL = "https://api.resend.com/emails"


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
    if Config.resend_configured():
        logger.info("Email via Resend API (from %s)", Config.RESEND_FROM)
    elif Config.smtp_configured():
        logger.info("Email via SMTP (from %s)", Config.MAIL_USERNAME)
    else:
        logger.warning("Email is NOT configured - welcome emails will be skipped")


def _send_smtp(app, msg):
    with app.app_context():
        mail.send(msg)


def _send_resend(to_email, subject, body, html):
    response = requests.post(
        RESEND_API_URL,
        headers={
            "Authorization": f"Bearer {Config.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": Config.RESEND_FROM,
            "to": [to_email],
            "subject": subject,
            "html": html,
            "text": body,
        },
        timeout=30,
    )
    if not response.ok:
        detail = response.text[:500]
        raise RuntimeError(f"Resend API {response.status_code}: {detail}")


def _send_async(app, payload):
    """Deliver one welcome email. Resend uses HTTPS (works on Render free tier)."""
    try:
        if payload["provider"] == "resend":
            _send_resend(
                payload["to_email"],
                payload["subject"],
                payload["body"],
                payload["html"],
            )
        else:
            _send_smtp(app, payload["msg"])
        logger.info("Welcome email sent to %s", payload["to_email"])
    except Exception:
        logger.exception("Failed to send email to %s", payload["to_email"])


def _dispatch(payload):
    """Queue email delivery on a background thread (non-daemon for gunicorn)."""
    if not Config.mail_configured():
        logger.warning(
            "Mail not configured; skipping email to %s", payload["to_email"]
        )
        return False

    app = current_app._get_current_object()
    threading.Thread(
        target=_send_async, args=(app, payload), daemon=False
    ).start()
    return True


def send_welcome_email(to_email, name, confirm_token=None):
    """Send the welcome email in the background.

    If ``confirm_token`` is given, the email also carries a confirmation link.
    Confirmation is purely for record-keeping - the account is already active,
    so the link never gates access to the dashboard. Google sign-ups pass no
    token because Google has already verified the address.
    """
    display_name = name or to_email.split("@")[0]
    dashboard_url = f"{Config.FRONTEND_URL}/app"

    confirm_text = ""
    confirm_html = ""
    if confirm_token:
        confirm_url = f"{Config.BACKEND_URL}/api/auth/confirm/{confirm_token}"
        confirm_text = (
            f"\nTo confirm this email address, open this link:\n{confirm_url}\n"
            f"(Optional - your account already works either way.)\n"
        )
        confirm_html = (
            f'<p style="color:#555">To confirm this email address, '
            f'<a href="{confirm_url}">click here</a>. '
            f"This is optional - your account already works either way.</p>"
        )

    subject = "Welcome to RCC"
    body = (
        f"Hi {display_name},\n\n"
        f"Welcome to RCC, your Resume and Career Coach.\n\n"
        f"Your account is ready. You can upload your resume, score it against any "
        f"job description, see the skills you are missing, and rehearse with an AI "
        f"interviewer.\n\n"
        f"Open your dashboard: {dashboard_url}\n"
        f"{confirm_text}\n"
        f"Best of luck with your job search,\n"
        f"The RCC Team\n"
    )
    html = (
        f"<p>Hi {display_name},</p>"
        f"<p>Welcome to RCC, your Resume and Career Coach.</p>"
        f"<p>Your account is ready. You can upload your resume, score it against any "
        f"job description, see the skills you are missing, and rehearse with an AI "
        f"interviewer.</p>"
        f'<p><a href="{dashboard_url}">Open your dashboard</a></p>'
        f"{confirm_html}"
        f"<p>Best of luck with your job search,<br/>The RCC Team</p>"
    )

    if Config.resend_configured():
        payload = {
            "provider": "resend",
            "to_email": to_email,
            "subject": subject,
            "body": body,
            "html": html,
        }
    else:
        msg = Message(subject=subject, recipients=[to_email], body=body, html=html)
        payload = {"provider": "smtp", "to_email": to_email, "msg": msg}

    return _dispatch(payload)
