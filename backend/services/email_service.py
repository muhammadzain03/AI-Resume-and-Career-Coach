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
    payload = {
        "from": Config.RESEND_FROM,
        "to": [to_email],
        "subject": subject,
        "html": html,
        "text": body,
    }
    if Config.RESEND_REPLY_TO:
        payload["reply_to"] = Config.RESEND_REPLY_TO

    response = requests.post(
        RESEND_API_URL,
        headers={
            "Authorization": f"Bearer {Config.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )
    if not response.ok:
        detail = response.text[:500]
        raise RuntimeError(f"Resend API {response.status_code}: {detail}")


def _send_async(app, payload):
    """Deliver one email. Resend uses HTTPS (works on Render free tier)."""
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
        logger.info(
            "Email '%s' sent to %s", payload.get("subject", "?"), payload["to_email"]
        )
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


def _build_payload(to_email, subject, body, html):
    if Config.resend_configured():
        return {
            "provider": "resend",
            "to_email": to_email,
            "subject": subject,
            "body": body,
            "html": html,
        }
    msg = Message(subject=subject, recipients=[to_email], body=body, html=html)
    if Config.RESEND_REPLY_TO:
        msg.reply_to = Config.RESEND_REPLY_TO
    return {"provider": "smtp", "to_email": to_email, "subject": subject, "msg": msg}


def send_verification_code_email(to_email, name, code):
    """Email the 6-digit verification code that gates account activation."""
    display_name = name or to_email.split("@")[0]
    subject = f"{code} is your RCC verification code"
    body = (
        f"Hi {display_name},\n\n"
        f"Your RCC verification code is:\n\n"
        f"    {code}\n\n"
        f"Enter it on the sign-in page to verify your email. "
        f"The code expires in 15 minutes.\n\n"
        f"If you didn't request this, you can safely ignore this email.\n"
    )
    html = (
        f"<p>Hi {display_name},</p>"
        f"<p>Your RCC verification code is:</p>"
        f'<p style="font-size:32px;font-weight:800;letter-spacing:8px;'
        f'font-family:monospace;margin:16px 0">{code}</p>'
        f"<p>Enter it on the sign-in page to verify your email. "
        f"The code expires in 15 minutes.</p>"
        f'<p style="color:#555">If you didn\'t request this, you can safely '
        f"ignore this email.</p>"
    )
    return _dispatch(_build_payload(to_email, subject, body, html))


def send_welcome_email(to_email, name):
    """Send the welcome email (in the background) once the account is verified."""
    display_name = name or to_email.split("@")[0]
    dashboard_url = f"{Config.FRONTEND_URL}/app"

    subject = "Welcome to RCC"
    body = (
        f"Hi {display_name},\n\n"
        f"Welcome to RCC, your Resume and Career Coach.\n\n"
        f"Your account is ready. You can upload your resume, score it against any "
        f"job description, see the skills you are missing, and rehearse with an AI "
        f"interviewer.\n\n"
        f"Open your dashboard: {dashboard_url}\n\n"
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
        f"<p>Best of luck with your job search,<br/>The RCC Team</p>"
    )

    return _dispatch(_build_payload(to_email, subject, body, html))
