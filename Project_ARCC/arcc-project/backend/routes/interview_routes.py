"""
Interview API (Phase 5 — F-07).

POST /start, /answer, /end, /transcribe are registered before /<session_id>
so names like "end" are not treated as UUIDs on GET.
"""

from flask import Blueprint, jsonify, request

from integrations.stt_client import transcribe
from services.interview_engine import create_session, end_session, get_next, get_session

interview_bp = Blueprint("interview", __name__)


@interview_bp.route("/health", methods=["GET"])
def interview_health():
    return jsonify({"status": "ok", "module": "interview"})


@interview_bp.route("/start", methods=["POST"])
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

    result = create_session(jd, role or None)
    return jsonify(result), 201


@interview_bp.route("/answer", methods=["POST"])
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
def end_interview():
    """JSON: session_id — drops session and returns summary."""
    data = request.get_json(silent=True) or {}
    session_id = (data.get("session_id") or "").strip()

    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    result = end_session(session_id)

    if "error" in result:
        return jsonify({"error": result["error"]}), 404

    return jsonify(result)


@interview_bp.route("/transcribe", methods=["POST"])
def transcribe_audio():
    """multipart field 'audio' — stub returns empty text until STT is wired."""
    audio_file = request.files.get("audio")

    if not audio_file:
        return jsonify({"error": "No audio file provided"}), 400

    mime_type = audio_file.mimetype or "audio/webm"
    audio_bytes = audio_file.read()

    result = transcribe(audio_bytes, mime_type)
    return jsonify(result)


@interview_bp.route("/<session_id>", methods=["GET"])
def get_interview(session_id):
    """GET session state for refresh."""
    result = get_session(session_id)

    if "error" in result:
        return jsonify({"error": result["error"]}), 404

    return jsonify(result)
