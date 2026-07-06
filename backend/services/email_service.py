import logging
import threading

from flask import current_app
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


def _send_async(app, msg):
    with app.app_context():
        try:
            mail.send(msg)
        except Exception:
            logger.exception("Failed to send email to %s", msg.recipients)


def _dispatch(msg):
    """Send an email without blocking the request.

    SMTP delivery can take several seconds, so we hand the message off to a
    background thread and return immediately. This keeps sign-up and sign-in
    responses fast. If mail is not configured, we quietly skip sending.
    """
    if not Config.mail_configured():
        logger.info("Mail not configured; skipping email to %s", msg.recipients)
        return False

    app = current_app._get_current_object()
    threading.Thread(target=_send_async, args=(app, msg), daemon=True).start()
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

    msg = Message(subject=subject, recipients=[to_email], body=body, html=html)
    return _dispatch(msg)
