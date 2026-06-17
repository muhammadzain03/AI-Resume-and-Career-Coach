"""
Interview API (Phase 5 - F-07).

Named routes (/start, /answer, /end, /history) are registered before
/<session_id> so they are not treated as UUIDs on GET.

Voice input is handled entirely in the browser via the Web Speech API
(Chrome/Edge), so there is no server-side transcription endpoint.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from auth_utils import current_user_id
from extensions import limiter
from services.interview_engine import (
    create_session,
    end_session,
    get_next,
    get_session,
    list_sessions,
)

interview_bp = Blueprint("interview", __name__)


@interview_bp.route("/health", methods=["GET"])
def interview_health():
    return jsonify({"status": "ok", "module": "interview"})


@interview_bp.route("/start", methods=["POST"])
@limiter.limit("20 per hour")
@jwt_required()
def start_interview():
    """
    JSON: job_description (required), role (optional)
    201: session_id, total_questions, first_question
    """
    data = request.get_json(silent=True) or {}
    jd = (data.get("job_description") or "").strip()
    role = (data.get("role") or "").strip()

    if not jd:
        return jsonify({"error": "job_description is required"}), 400

    result = create_session(jd, role or None, user_id=current_user_id())
    return jsonify(result), 201


@interview_bp.route("/answer", methods=["POST"])
@limiter.limit("120 per hour")
@jwt_required()
def submit_answer():
    """
    JSON: session_id, answer
    200: feedback, optional next_question, complete, optional summary
    """
    data = request.get_json(silent=True) or {}
    session_id = (data.get("session_id") or "").strip()
    answer = (data.get("answer") or "").strip()

    if not session_id:
        return jsonify({"error": "session_id is required"}), 400
    if not answer:
        return jsonify({"error": "answer is required"}), 400

    result = get_next(session_id, answer)

    if "error" in result:
        code = 404 if result["error"] == "session_not_found" else 410
        return jsonify({"error": result["error"]}), code

    return jsonify(result)


@interview_bp.route("/end", methods=["POST"])
@jwt_required()
def end_interview():
    """JSON: session_id - marks the session complete and returns a summary."""
    data = request.get_json(silent=True) or {}
    session_id = (data.get("session_id") or "").strip()

    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    result = end_session(session_id)

    if "error" in result:
        return jsonify({"error": result["error"]}), 404

    return jsonify(result)


@interview_bp.route("/history", methods=["GET"])
@jwt_required()
def interview_history():
    """Recent interview sessions for the signed-in user (H2)."""
    raw_limit = request.args.get("limit", "20")
    try:
        limit = max(1, min(int(raw_limit), 100))
    except (TypeError, ValueError):
        limit = 20

    sessions = list_sessions(current_user_id(), limit)
    return jsonify({"count": len(sessions), "sessions": sessions})


@interview_bp.route("/<session_id>", methods=["GET"])
@jwt_required()
def get_interview(session_id):
    """GET session state (transcript + summary) for refresh or review."""
    result = get_session(session_id)

    if "error" in result:
        return jsonify({"error": result["error"]}), 404

    return jsonify(result)
