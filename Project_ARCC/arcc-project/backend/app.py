from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import RequestEntityTooLarge

from config import Config
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

    @app.errorhandler(RequestEntityTooLarge)
    def handle_oversize(e):
        return jsonify({"error": "File exceeds 4 MB limit"}), 413

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(resume_bp, url_prefix="/api/resume")
    app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
    app.register_blueprint(interview_bp, url_prefix="/api/interview")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=True)
