import logging
import secrets

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from werkzeug.security import generate_password_hash, check_password_hash

from config import Config
from database.db import get_conn
from services.email_service import send_welcome_email

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)


def _user_payload(row):
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row.get("name"),
        "email_verified": bool(row.get("email_verified")),
        "avatar_url": row.get("avatar_url"),
    }


def _token_response(user_row):
    user_id = user_row["id"]
    access = create_access_token(identity=str(user_id))
    refresh = create_refresh_token(identity=str(user_id))
    return {
        "user": _user_payload(user_row),
        "access_token": access,
        "refresh_token": refresh,
    }


@auth_bp.route("/health", methods=["GET"])
def auth_health():
    return jsonify({"status": "ok", "module": "auth"})


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    hashed = generate_password_hash(password)
    # The account is active immediately (email_verified=True); this token only
    # backs an optional confirmation link in the welcome email and never gates
    # access. It is cleared once the user clicks the link.
    confirm_token = secrets.token_urlsafe(32)

    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            return jsonify({"error": "Email already registered"}), 409

        cur.execute(
            """
            INSERT INTO users
                (email, password_hash, name, email_verified, verification_token)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (email, hashed, name or None, True, confirm_token),
        )
        user_id = cur.fetchone()["id"]
        conn.commit()

        cur.execute(
            """
            SELECT id, email, name, email_verified, avatar_url
            FROM users WHERE id=%s
            """,
            (user_id,),
        )
        user_row = cur.fetchone()
    except Exception:
        logger.exception("Register failed for %s", email)
        return jsonify({"error": "Database error"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()

    send_welcome_email(email, name, confirm_token=confirm_token)

    return jsonify({
        **_token_response(user_row),
        "message": "Welcome to RCC. Your account is ready.",
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT id, email, name, password_hash, email_verified, avatar_url, google_id
            FROM users WHERE email=%s
            """,
            (email,),
        )
        user = cur.fetchone()
    except Exception:
        logger.exception("Login DB error for %s", email)
        return jsonify({"error": "Database error"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()

    if not user or not user.get("password_hash"):
        return jsonify({"error": "Invalid credentials"}), 401
    if not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify(_token_response(user))


@auth_bp.route("/google", methods=["POST"])
def google_auth():
    data = request.get_json(silent=True) or {}
    credential = data.get("credential") or data.get("id_token") or ""

    if not credential:
        return jsonify({"error": "Google credential is required"}), 400
    if not Config.GOOGLE_CLIENT_ID:
        return jsonify({"error": "Google sign-in is not configured on the server"}), 503

    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            Config.GOOGLE_CLIENT_ID,
        )
    except Exception:
        logger.exception("Google token verification failed")
        return jsonify({"error": "Invalid Google credential"}), 401

    google_sub = idinfo.get("sub")
    email = (idinfo.get("email") or "").strip().lower()
    name = (idinfo.get("name") or "").strip()
    avatar = idinfo.get("picture")

    if not google_sub or not email:
        return jsonify({"error": "Google account missing required fields"}), 400

    conn, cur = None, None
    is_new_user = False
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        cur.execute("SELECT * FROM users WHERE google_id=%s", (google_sub,))
        user = cur.fetchone()

        if not user:
            cur.execute("SELECT * FROM users WHERE email=%s", (email,))
            user = cur.fetchone()
            if user:
                cur.execute(
                    """
                    UPDATE users
                    SET google_id=%s, name=COALESCE(name, %s), avatar_url=COALESCE(avatar_url, %s),
                        email_verified=TRUE, verification_token=NULL
                    WHERE id=%s
                    """,
                    (google_sub, name or None, avatar, user["id"]),
                )
            else:
                is_new_user = True
                cur.execute(
                    """
                    INSERT INTO users
                        (email, google_id, name, avatar_url, email_verified, password_hash)
                    VALUES (%s, %s, %s, %s, TRUE, NULL)
                    RETURNING id
                    """,
                    (email, google_sub, name or None, avatar),
                )
                user = {"id": cur.fetchone()["id"]}
            conn.commit()

        cur.execute(
            """
            SELECT id, email, name, email_verified, avatar_url
            FROM users WHERE id=%s
            """,
            (user["id"],),
        )
        user_row = cur.fetchone()
    except Exception:
        logger.exception("Google auth DB error for %s", email)
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return jsonify({"error": "Database error"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()

    if is_new_user:
        send_welcome_email(email, name)

    return jsonify(_token_response(user_row))


@auth_bp.route("/confirm/<token>", methods=["GET"])
def confirm_email(token):
    """Record that a user confirmed their email address.

    This does NOT gate access - accounts are active from sign-up. Clicking the
    link simply clears the pending confirmation token for record-keeping, then
    shows a small confirmation page. Unknown/already-used tokens still render a
    friendly page rather than an error.
    """
    if token:
        conn, cur = None, None
        try:
            conn = get_conn()
            cur = conn.cursor(dictionary=True)
            cur.execute(
                "UPDATE users SET verification_token=NULL WHERE verification_token=%s",
                (token,),
            )
            conn.commit()
        except Exception:
            logger.exception("Email confirmation failed")
        finally:
            if cur is not None:
                cur.close()
            if conn is not None:
                conn.close()

    app_url = f"{Config.FRONTEND_URL}/app"
    page = (
        "<!doctype html><html lang='en'><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width, initial-scale=1'>"
        "<title>Email confirmed - RCC</title></head>"
        "<body style='font-family:system-ui,-apple-system,Segoe UI,sans-serif;"
        "max-width:480px;margin:80px auto;padding:0 24px;text-align:center;color:#111'>"
        "<h1 style='font-size:22px;margin-bottom:8px'>Your email is confirmed</h1>"
        "<p style='color:#555;line-height:1.5'>Thanks for confirming your address. "
        "Your RCC account is ready to use.</p>"
        f"<p style='margin-top:24px'><a href='{app_url}' "
        "style='display:inline-block;padding:10px 22px;background:#111;color:#fff;"
        "border-radius:8px;text-decoration:none'>Open RCC</a></p>"
        "</body></html>"
    )
    return page, 200, {"Content-Type": "text/html; charset=utf-8"}


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT id, email, name, email_verified, avatar_url
            FROM users WHERE id=%s
            """,
            (user_id,),
        )
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"user": _user_payload(user)})
    except Exception:
        logger.exception("Failed to load user %s", user_id)
        return jsonify({"error": "Database error"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    return jsonify({"access_token": create_access_token(identity=user_id)})
