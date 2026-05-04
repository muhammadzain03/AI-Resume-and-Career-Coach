import logging

from flask import Blueprint, request, jsonify

from database.db import get_conn
from integrations.llm_client import (
    analyze_resume_job,
    pack_analysis_for_db,
    unpack_analysis_from_db,
)

logger = logging.getLogger(__name__)

analysis_bp = Blueprint("analysis", __name__)

def extract_job_title(description: str) -> str:
    """
    Extract a readable title from the job description.

    Strategy:
    - Take first non-empty line
    - Remove common prefixes
    - Truncate for UI safety
    """
    if not description:
        return "Untitled Role"

    lines = [line.strip() for line in description.split("\n") if line.strip()]
    if not lines:
        return "Untitled Role"

    first = lines[0]

    first = first.replace("Specific Job Description :", "").strip()

    return first[:80]

@analysis_bp.route("/health", methods=["GET"])
def analysis_health():
    return jsonify({"status": "ok", "module": "analysis"})

@analysis_bp.route("/run", methods=["POST"])
def run_analysis():
    """
    Runs resume vs job analysis.

    Request JSON:
        resume_id       (int, required)
        job_description (str, required)
        user_id         (int, optional)

    Response JSON (201):
        analysis_id, resume_id, job_id, match_score,
        matched_skills, missing_skills, suggestions
    """
    data = request.get_json(silent=True) or {}

    resume_id = data.get("resume_id")
    job_description = (data.get("job_description") or "").strip()
    user_id = data.get("user_id")

    if resume_id in (None, "") or not job_description:
        return jsonify({"error": "resume_id and job_description are required"}), 400

    try:
        resume_id = int(resume_id)
    except (TypeError, ValueError):
        return jsonify({"error": "resume_id must be an integer"}), 400

    parsed_user_id = None
    if user_id not in (None, ""):
        try:
            parsed_user_id = int(user_id)
        except (TypeError, ValueError):
            return jsonify({"error": "user_id must be an integer"}), 400

    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        cur.execute(
            "SELECT id, text_content FROM resumes WHERE id=%s",
            (resume_id,),
        )
        resume = cur.fetchone()

        if not resume:
            return jsonify({"error": "resume not found"}), 404

        raw_resume = (resume.get("text_content") or "").strip()
        if not raw_resume:
            return jsonify({"error": "resume has no extracted text"}), 422

        try:
            payload = analyze_resume_job(raw_resume, job_description)
        except Exception:
            logger.exception("Analysis pipeline failed for resume_id=%s", resume_id)
            return jsonify({"error": "Analysis failed"}), 500

        cur.execute(
            "INSERT INTO job_descriptions (user_id, description) VALUES (%s, %s)",
            (parsed_user_id, job_description),
        )
        job_id = cur.lastrowid

        suggestions_blob = pack_analysis_for_db(payload)

        cur.execute(
            """
            INSERT INTO analysis_results (resume_id, job_id, match_score, suggestions)
            VALUES (%s, %s, %s, %s)
            """,
            (
                resume_id,
                job_id,
                float(payload["match_score"]),
                suggestions_blob,
            ),
        )
        analysis_id = cur.lastrowid

        conn.commit()

        return jsonify({
            "analysis_id": analysis_id,
            "resume_id": resume_id,
            "job_id": job_id,
            "match_score": payload["match_score"],
            "matched_skills": payload["matched_skills"],
            "missing_skills": payload["missing_skills"],
            "suggestions": payload["suggestions"],
        }), 201

    except Exception:
        logger.exception("Database error during analysis run")
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return jsonify({"error": "Database error"}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@analysis_bp.route("/<int:analysis_id>", methods=["GET"])
def get_analysis(analysis_id):
    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        cur.execute(
            """
            SELECT ar.id, ar.resume_id, ar.job_id, ar.match_score, ar.suggestions,
                   jd.description
            FROM analysis_results ar
            LEFT JOIN job_descriptions jd ON jd.id = ar.job_id
            WHERE ar.id = %s
            """,
            (analysis_id,),
        )

        row = cur.fetchone()
        if not row:
            return jsonify({"error": "analysis not found"}), 404

        unpacked = unpack_analysis_from_db(row.get("suggestions"))

        return jsonify({
            "analysis_id": row["id"],
            "resume_id": row["resume_id"],
            "job_id": row["job_id"],
            "match_score": row["match_score"],
            "job_description": row.get("description") or "",
            "matched_skills": unpacked["matched_skills"],
            "missing_skills": unpacked["missing_skills"],
            "suggestions": unpacked["suggestions"],
        })

    except Exception:
        logger.exception("Database error fetching analysis_id=%s", analysis_id)
        return jsonify({"error": "Database error"}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@analysis_bp.route("/history", methods=["GET"])
def get_history():
    """
    Demo-friendly history endpoint (no user filtering).

    Query params:
        limit (int, optional, default=20, max=100)

    Response:
        {
          count,
          history: [
            analysis_id,
            resume_id,
            job_id,
            match_score,
            filename,
            job_title,
            created_at
          ]
        }
    """
    raw_limit = request.args.get("limit", "20")

    try:
        limit = max(1, min(int(raw_limit), 100))
    except (TypeError, ValueError):
        limit = 20

    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        cur.execute(
            """
            SELECT
                ar.id AS analysis_id,
                ar.resume_id,
                ar.job_id,
                ar.match_score,
                ar.created_at,
                r.filename,
                jd.description AS job_description
            FROM analysis_results ar
            JOIN resumes r ON r.id = ar.resume_id
            JOIN job_descriptions jd ON jd.id = ar.job_id
            ORDER BY ar.created_at DESC
            LIMIT %s
            """,
            (limit,),
        )

        rows = cur.fetchall()

        history = [
            {
                "analysis_id": row["analysis_id"],
                "resume_id": row["resume_id"],
                "job_id": row["job_id"],
                "match_score": float(row["match_score"]),
                "filename": row["filename"],
                "job_title": extract_job_title(row["job_description"]),
                "created_at": str(row["created_at"]),
            }
            for row in rows
        ]

        return jsonify({
            "count": len(history),
            "history": history,
        })

    except Exception:
        logger.exception("Database error fetching history")
        return jsonify({"error": "Database error"}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()