import logging
import os
import tempfile
from flask import Blueprint, request, jsonify
from database.db import get_conn
from services.resume_parser import parse_resume_file

logger = logging.getLogger(__name__)

resume_bp = Blueprint("resume", __name__)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE = 4 * 1024 * 1024


@resume_bp.route("/upload", methods=["POST"])
def upload_resume():
    file = request.files.get("resume")
    user_id = request.form.get("user_id")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    filename = file.filename or "resume"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Unsupported file type. Use PDF, DOCX, or TXT."}), 400

    parsed_user_id = None
    if user_id not in (None, ""):
        try:
            parsed_user_id = int(user_id)
        except (ValueError, TypeError):
            return jsonify({"error": "user_id must be an integer"}), 400

    fd, temp_path = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    try:
        file.save(temp_path)

        if os.path.getsize(temp_path) > MAX_FILE_SIZE:
            return jsonify({"error": "File exceeds 4 MB limit"}), 400

        try:
            parsed = parse_resume_file(temp_path)
            raw_text = (parsed or {}).get("raw_text", "").strip()
            if not raw_text:
                return jsonify({"error": "No text could be extracted from the resume"}), 422
        except Exception:
            logger.exception("Resume parsing failed for file: %s", filename)
            return jsonify({"error": "Failed to parse resume"}), 422

        conn, cur = None, None
        try:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO resumes (user_id, filename, text_content)"
                " VALUES (%s, %s, %s)",
                (parsed_user_id, filename, raw_text),
            )
            conn.commit()
            resume_id = cur.lastrowid
        except Exception:
            logger.exception("DB insert failed for file: %s", filename)
            return jsonify({"error": "Database error"}), 500
        finally:
            if cur is not None:
                cur.close()
            if conn is not None:
                conn.close()

        return jsonify({
            "message": "Resume parsed successfully",
            "resume_id": resume_id,
            "filename": filename,
            "preview": raw_text[:500],
        }), 201

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@resume_bp.route("/<int:resume_id>", methods=["GET"])
def get_resume(resume_id):
    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, user_id, filename, text_content, created_at"
            " FROM resumes WHERE id = %s",
            (resume_id,),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "resume not found"}), 404

        return jsonify({
            "resume_id": row["id"],
            "user_id": row["user_id"],
            "filename": row["filename"],
            "preview": (row["text_content"] or "")[:500],
            "created_at": str(row["created_at"]),
        })
    except Exception:
        logger.exception("DB error fetching resume_id=%s", resume_id)
        return jsonify({"error": "Database error"}), 500
    finally:
        if cur is not None:
            cur.close()
        if conn is not None:
            conn.close()
