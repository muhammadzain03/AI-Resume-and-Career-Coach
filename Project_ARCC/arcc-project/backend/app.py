from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import RequestEntityTooLarge

from config import Config
from extensions import limiter
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

    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Type"],
    )

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
        except Exception as exc:  # noqa: BLE001 - report any DB failure to the caller
            db_ok = False
            db_error = str(exc)[:200]
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass

        status = "ok" if db_ok else "degraded"
        return jsonify({
            "status": status,
            "database": "ok" if db_ok else "unreachable",
            "database_error": db_error,
        }), (200 if db_ok else 503)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(resume_bp, url_prefix="/api/resume")
    app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
    app.register_blueprint(interview_bp, url_prefix="/api/interview")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=True)
