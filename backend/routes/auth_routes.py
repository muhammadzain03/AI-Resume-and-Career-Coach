import logging
import secrets
from datetime import datetime, timedelta

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
from extensions import limiter
from services.email_service import send_verification_code_email, send_welcome_email

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)

# How long an emailed verification code stays valid.
CODE_TTL_MINUTES = 15


def _generate_code():
    """6-digit numeric code, zero-padded (e.g. 042917)."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _user_payload(row, first_login=None):
    payload = {
        "id": row["id"],
        "email": row["email"],
        "name": row.get("name"),
        "email_verified": bool(row.get("email_verified")),
        "avatar_url": row.get("avatar_url"),
    }
    if first_login is not None:
        payload["first_login"] = bool(first_login)
    return payload


def _token_response(user_row, first_login=None):
    user_id = user_row["id"]
    access = create_access_token(identity=str(user_id))
    refresh = create_refresh_token(identity=str(user_id))
    return {
        "user": _user_payload(user_row, first_login=first_login),
        "access_token": access,
        "refresh_token": refresh,
    }


def _issue_session(cur, conn, user_row):
    """Issue JWTs and record the login.

    A NULL last_login_at means this is the user's very first login - the
    dashboard uses the flag to greet with "Welcome" instead of "Welcome back".
    """
    cur.execute("SELECT last_login_at FROM users WHERE id=%s", (user_row["id"],))
    row = cur.fetchone()
    first_login = row is None or row.get("last_login_at") is None
    cur.execute(
        "UPDATE users SET last_login_at=%s WHERE id=%s",
        (datetime.utcnow(), user_row["id"]),
    )
    conn.commit()
    return _token_response(user_row, first_login=first_login)


def _start_verification(cur, conn, user_id):
    """Store a fresh code + expiry on the user and return the code."""
    code = _generate_code()
    expires = datetime.utcnow() + timedelta(minutes=CODE_TTL_MINUTES)
    cur.execute(
        "UPDATE users SET verification_token=%s, verification_expires_at=%s WHERE id=%s",
        (code, expires, user_id),
    )
    conn.commit()
    return code


def _verification_pending_response(email, status=200):
    return jsonify({
        "verification_required": True,
        "email": email,
        "message": f"We sent a 6-digit verification code to {email}. "
                   f"Enter it below to continue.",
    }), status


@auth_bp.route("/health", methods=["GET"])
def auth_health():
    return jsonify({"status": "ok", "module": "auth"})


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("15 per hour")
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
                (email, password_hash, name, email_verified)
            VALUES (%s, %s, %s, FALSE)
            RETURNING id
            """,
            (email, hashed, name or None),
        )
        user_id = cur.fetchone()["id"]
        code = _start_verification(cur, conn, user_id)
    except Exception:
        logger.exception("Register failed for %s", email)
        return jsonify({"error": "Database error"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()

    send_verification_code_email(email, name, code)
    return _verification_pending_response(email, status=201)


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
@limiter.limit("50 per hour")
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

        if not user or not user.get("password_hash"):
            return jsonify({"error": "Invalid credentials"}), 401
        if not check_password_hash(user["password_hash"], password):
            return jsonify({"error": "Invalid credentials"}), 401

        if not user.get("email_verified"):
            code = _start_verification(cur, conn, user["id"])
            send_verification_code_email(email, user.get("name"), code)
            return _verification_pending_response(email, status=403)

        return jsonify(_issue_session(cur, conn, user))
    except Exception:
        logger.exception("Login DB error for %s", email)
        return jsonify({"error": "Database error"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()


@auth_bp.route("/google", methods=["POST"])
@limiter.limit("20 per minute")
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
                # Existing account signing in with Google for the first time -
                # link the Google identity but keep its current verified state.
                cur.execute(
                    """
                    UPDATE users
                    SET google_id=%s, name=COALESCE(name, %s), avatar_url=COALESCE(avatar_url, %s)
                    WHERE id=%s
                    """,
                    (google_sub, name or None, avatar, user["id"]),
                )
            else:
                # Brand-new Google sign-up: same email-code gate as direct
                # sign-ups, so every account verifies its inbox once.
                cur.execute(
                    """
                    INSERT INTO users
                        (email, google_id, name, avatar_url, email_verified, password_hash)
                    VALUES (%s, %s, %s, %s, FALSE, NULL)
                    RETURNING id
                    """,
                    (email, google_sub, name or None, avatar),
                )
                user = {"id": cur.fetchone()["id"], "email_verified": False}
            conn.commit()

        cur.execute(
            """
            SELECT id, email, name, email_verified, avatar_url
            FROM users WHERE id=%s
            """,
            (user["id"],),
        )
        user_row = cur.fetchone()

        if not user_row.get("email_verified"):
            code = _start_verification(cur, conn, user_row["id"])
            send_verification_code_email(email, name or user_row.get("name"), code)
            return _verification_pending_response(email)

        return jsonify(_issue_session(cur, conn, user_row))
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


@auth_bp.route("/verify-code", methods=["POST"])
@limiter.limit("30 per hour")
def verify_code():
    """Verify the emailed 6-digit code, activate the account, and log in."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    code = (data.get("code") or "").strip()

    if not email or not code:
        return jsonify({"error": "Email and code are required"}), 400

    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT id, email, name, email_verified, avatar_url,
                   verification_token, verification_expires_at
            FROM users WHERE email=%s
            """,
            (email,),
        )
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "Invalid code. Check the email we sent you."}), 400

        if user.get("email_verified"):
            # Already verified (e.g. double submit) - just log them in.
            return jsonify(_issue_session(cur, conn, user))

        stored = user.get("verification_token") or ""
        expires = user.get("verification_expires_at")
        if not stored or not secrets.compare_digest(stored, code):
            return jsonify({"error": "Invalid code. Check the email we sent you."}), 400
        if expires is None or datetime.utcnow() > expires:
            return jsonify({
                "error": "That code has expired. Request a new one and try again."
            }), 400

        cur.execute(
            """
            UPDATE users
            SET email_verified=TRUE, verification_token=NULL, verification_expires_at=NULL
            WHERE id=%s
            """,
            (user["id"],),
        )
        conn.commit()
        user["email_verified"] = True

        response = _issue_session(cur, conn, user)
    except Exception:
        logger.exception("Code verification failed for %s", email)
        return jsonify({"error": "Database error"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()

    # The account is now verified and logged in - this is the moment the
    # welcome email goes out (in the background).
    send_welcome_email(email, user.get("name"))
    return jsonify(response)


@auth_bp.route("/resend-code", methods=["POST"])
@limiter.limit("6 per hour")
def resend_code():
    """Send a fresh verification code. Response is intentionally generic so
    this endpoint can't be used to probe which emails are registered."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, name, email_verified FROM users WHERE email=%s", (email,)
        )
        user = cur.fetchone()
        if user and not user.get("email_verified"):
            code = _start_verification(cur, conn, user["id"])
            send_verification_code_email(email, user.get("name"), code)
    except Exception:
        logger.exception("Resend code failed for %s", email)
        return jsonify({"error": "Database error"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()

    return jsonify({
        "message": f"If an unverified account exists for {email}, "
                   f"a new code is on its way."
    })


@auth_bp.route("/account", methods=["DELETE"])
@jwt_required()
def delete_account():
    """Permanently delete the authenticated user's account and all their data.

    The user FKs are ON DELETE SET NULL, which would orphan rows instead of
    removing them - so every table is wiped explicitly, in one transaction.
    analysis_results cascades from resumes/job_descriptions.
    """
    user_id = get_jwt_identity()

    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        cur.execute("SELECT id, email FROM users WHERE id=%s", (user_id,))
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404

        cur.execute(
            "DELETE FROM interview_sessions WHERE user_id=%s", (user_id,)
        )
        cur.execute("DELETE FROM resumes WHERE user_id=%s", (user_id,))
        cur.execute("DELETE FROM job_descriptions WHERE user_id=%s", (user_id,))
        cur.execute("DELETE FROM users WHERE id=%s", (user_id,))
        conn.commit()

        logger.info("Account deleted for user id=%s (%s)", user_id, user["email"])
    except Exception:
        logger.exception("Account deletion failed for user id=%s", user_id)
        if conn is not None:
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

    return jsonify({"message": "Your account and all associated data have been deleted."})


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
