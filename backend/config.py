import os
import secrets
from dotenv import load_dotenv

load_dotenv()


class Config:
    PORT = int(os.getenv("PORT", "5000"))

    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_NAME = os.getenv("DB_NAME", "arcc")
    # "prefer" negotiates SSL but falls back to plaintext (works with the local
    # Docker container). Managed hosts like Neon require SSL: set DB_SSLMODE=require.
    DB_SSLMODE = os.getenv("DB_SSLMODE", "prefer")

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_hex(32))
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "3600"))
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "2592000"))

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

    # Public base URL of this backend, used to build the email-confirmation link.
    # On Render this is provided automatically as RENDER_EXTERNAL_URL, so no manual
    # configuration is needed there. Falls back to localhost for local development.
    BACKEND_URL = (
        os.getenv("BACKEND_URL")
        or os.getenv("RENDER_EXTERNAL_URL")
        or "http://localhost:5000"
    ).rstrip("/")

    # Browser origins allowed to call the API (CORS). Defaults to the real
    # frontend plus localhost for development. Override with a comma-separated
    # CORS_ORIGINS env var if you ever serve the frontend from more domains.
    CORS_ORIGINS = [
        origin.strip().rstrip("/")
        for origin in os.getenv(
            "CORS_ORIGINS",
            ",".join([FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"]),
        ).split(",")
        if origin.strip()
    ]

    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "false").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", MAIL_USERNAME)

    # Resend sends over HTTPS (port 443). Required on Render's free tier, which
    # blocks outbound SMTP (ports 25/465/587) and causes "Network is unreachable".
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM = os.getenv(
        "RESEND_FROM",
        'RCC <onboarding@resend.dev>',
    )
    # Where user replies land (Resend is outbound-only; no inbox on support@...).
    RESEND_REPLY_TO = os.getenv("RESEND_REPLY_TO", "").strip()

    LLM_API_KEY = os.getenv("LLM_API_KEY", "")
    LLM_BASE_URL = os.getenv(
        "LLM_BASE_URL",
        "https://generativelanguage.googleapis.com/v1beta/openai",
    ).rstrip("/")
    LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.5-flash")

    @classmethod
    def smtp_configured(cls):
        return bool(cls.MAIL_USERNAME and cls.MAIL_PASSWORD)

    @classmethod
    def resend_configured(cls):
        return bool(cls.RESEND_API_KEY and cls.RESEND_FROM)

    @classmethod
    def mail_configured(cls):
        return cls.resend_configured() or cls.smtp_configured()
