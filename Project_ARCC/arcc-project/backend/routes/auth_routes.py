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
from services.email_service import send_verification_email, send_welcome_email

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

    verification_token = secrets.token_urlsafe(32)
    hashed = generate_password_hash(password)

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
            """,
            (email, hashed, name or None, False, verification_token),
        )
        conn.commit()
        user_id = cur.lastrowid

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

    send_verification_email(email, name, verification_token)

    return jsonify({
        **_token_response(user_row),
        "message": "Account created. Please check your email to verify your address.",
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
    if not user.get("email_verified") and not user.get("google_id"):
        return jsonify({
            "error": "Email not verified. Check your inbox for the verification link.",
            "email_verified": False,
        }), 403

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
                cur.execute(
                    """
                    INSERT INTO users
                        (email, google_id, name, avatar_url, email_verified, password_hash)
                    VALUES (%s, %s, %s, %s, TRUE, NULL)
                    """,
                    (email, google_sub, name or None, avatar),
                )
                user = {"id": cur.lastrowid}
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

    send_welcome_email(email, name)

    return jsonify(_token_response(user_row))


@auth_bp.route("/verify/<token>", methods=["GET"])
def verify_email(token):
    if not token:
        return jsonify({"error": "Invalid verification token"}), 400

    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, email, name, email_verified, avatar_url FROM users WHERE verification_token=%s",
            (token,),
        )
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "Invalid or expired verification link"}), 404
        if user.get("email_verified"):
            return jsonify({
                "message": "Email already verified",
                "user": _user_payload(user),
            })

        cur.execute(
            """
            UPDATE users SET email_verified=TRUE, verification_token=NULL WHERE id=%s
            """,
            (user["id"],),
        )
        conn.commit()
        user["email_verified"] = True
    except Exception:
        logger.exception("Email verification failed")
        return jsonify({"error": "Database error"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()

    return jsonify({
        "message": "Email verified successfully",
        "user": _user_payload(user),
    })


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
