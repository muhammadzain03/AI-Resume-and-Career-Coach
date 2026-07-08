import logging
from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import RequestEntityTooLarge

from config import Config
from extensions import limiter

logger = logging.getLogger(__name__)
from routes.auth_routes import auth_bp
from routes.resume_routes import resume_bp
from routes.analysis_routes import analysis_bp
from routes.interview_routes import interview_bp
from services.email_service import init_mail


def create_app():
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(
        seconds=Config.JWT_ACCESS_TOKEN_EXPIRES
    )
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(
        seconds=Config.JWT_REFRESH_TOKEN_EXPIRES
    )

    # Only our own frontend (and localhost during development) may call the API
    # from a browser. Requests from any other site get no CORS approval.
    CORS(
        app,
        resources={r"/api/*": {"origins": Config.CORS_ORIGINS}},
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Type"],
    )

    @app.after_request
    def set_security_headers(response):
        """Baseline hardening headers on every API response. The API only ever
        returns JSON, so a strict CSP here costs nothing and blocks a compromised
        response from loading external scripts."""
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        )
        # HSTS is ignored by browsers over plain HTTP, so it's safe to always set;
        # it only takes effect once served over HTTPS (Render terminates TLS).
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
        return response

    JWTManager(app)
    init_mail(app)
    limiter.init_app(app)

    # Self-heal the schema: ensures engine-plan tables/columns exist even on a
    # pre-existing DB volume. No-op on a fresh DB; safe if the DB is down.
    from database.migrate_engine import apply_on_startup
    apply_on_startup()

    @app.errorhandler(RequestEntityTooLarge)
    def handle_oversize(e):
        return jsonify({"error": "File exceeds 4 MB limit"}), 413

    @app.errorhandler(429)
    def handle_rate_limited(e):
        return jsonify({
            "error": "rate_limited",
            "message": "Too many requests. Please slow down and try again shortly.",
        }), 429

    @app.route("/api/health")
    def health():
        """Liveness + DB reachability, for quick diagnosis of setup issues."""
        db_ok, db_error = True, None
        conn = None
        try:
            from database.db import get_conn

            conn = get_conn()
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.fetchone()
            cur.close()
        except Exception as exc:  # noqa: BLE001 - never crash the health check
            db_ok = False
            db_error = str(exc)
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass

        # Log the real error server-side, but don't expose DB internals (host,
        # driver, stack details) to anonymous callers of a public endpoint.
        if not db_ok:
            logger.warning("Health check: database unreachable: %s", db_error)

        status = "ok" if db_ok else "degraded"
        return jsonify({
            "status": status,
            "database": "ok" if db_ok else "unreachable",
        }), (200 if db_ok else 503)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(resume_bp, url_prefix="/api/resume")
    app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
    app.register_blueprint(interview_bp, url_prefix="/api/interview")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=True)
