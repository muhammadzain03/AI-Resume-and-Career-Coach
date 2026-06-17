"""
LLM-powered interview session engine.

Uses Gemini (OpenAI-compat) for dynamic questions, follow-ups, and feedback.
Falls back to a static question bank when no LLM key is configured.

Sessions are persisted in the `interview_sessions` MySQL table so they survive
server restarts and work across multiple workers. A module-level dict is kept
only as an optional fast-path cache in front of the database.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Optional

import requests

from config import Config
from database.db import get_conn

logger = logging.getLogger(__name__)

# Fast-path cache only. The database is the source of truth.
_SESSIONS: dict[str, dict[str, Any]] = {}

_REQUEST_TIMEOUT = 30
_MAX_QUESTIONS = 8

QUESTION_BANK = [
    "Tell me about yourself and why you are interested in this role.",
    "What is your greatest professional strength and how have you applied it?",
    "Describe a challenging project you worked on and how you handled it.",
    "How do you prioritize tasks when working under pressure or tight deadlines?",
    "Give an example of a time you worked effectively in a team.",
    "What is a weakness you have identified and what are you doing to improve it?",
    "Where do you see yourself professionally in the next three to five years?",
    "Describe a situation where you had to learn something new quickly.",
]

SYSTEM_PROMPT = (
    "You are a professional, friendly interview coach named RCC. "
    "You are conducting a mock interview for the candidate.\n\n"
    "RULES:\n"
    "- Ask ONE question at a time. Keep questions concise (1-2 sentences).\n"
    "- After the candidate answers, give brief encouraging feedback (2-3 sentences max), "
    "then ask the next question.\n"
    "- Mix behavioral, situational, and role-specific questions based on the job description.\n"
    "- Adapt follow-up questions based on the candidate's answers.\n"
    "- Be warm and professional - this is coaching, not grilling.\n"
    "- After {max_q} questions, wrap up with a brief overall summary and tips.\n\n"
    "RESPONSE FORMAT - always reply with this exact JSON structure:\n"
    '{{"feedback": "your feedback on their answer (empty string for first question)", '
    '"question": "your next question (empty string when interview is complete)", '
    '"complete": false, '
    '"summary": "only populated when complete is true - 3-4 sentence overall assessment"}}\n\n'
    "JOB DESCRIPTION:\n{jd}\n\n"
    "ROLE: {role}"
).replace("{max_q}", str(_MAX_QUESTIONS))


def _llm_available() -> bool:
    return bool(Config.LLM_API_KEY and Config.LLM_API_KEY.strip())


def _chat_completion(messages: list[dict[str, str]], json_mode: bool = True) -> str:
    url = f"{Config.LLM_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {Config.LLM_API_KEY.strip()}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {
        "model": Config.LLM_MODEL,
        "messages": messages,
        "temperature": 0.55,
    }
    if json_mode:
        # Gemini's OpenAI-compatible endpoint honours structured output, which
        # makes the JSON parse below succeed far more often.
        payload["response_format"] = {"type": "json_object"}
    resp = requests.post(url, headers=headers, json=payload, timeout=_REQUEST_TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    return (data["choices"][0]["message"].get("content") or "").strip()


def _parse_llm_response(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    return json.loads(text)


def _chat_json(messages: list[dict[str, str]]) -> tuple[str, dict[str, Any]]:
    """Call the LLM expecting JSON, with one retry on a parse failure.

    Returns (raw_assistant_text, parsed_dict). Raises on hard transport
    failures or if both attempts fail to parse.
    """
    last_err: Exception | None = None
    for attempt in range(2):
        raw = _chat_completion(messages, json_mode=True)
        try:
            return raw, _parse_llm_response(raw)
        except (json.JSONDecodeError, ValueError) as err:
            last_err = err
            logger.warning("Interview LLM JSON parse failed (attempt %d).", attempt + 1)
    raise last_err if last_err else RuntimeError("LLM JSON parse failed")


def _build_system_message(jd: str, role: str) -> str:
    return SYSTEM_PROMPT.format(jd=jd[:2000].strip(), role=role or "General")


def _jd_questions(jd: str, role: str) -> list[str]:
    opener = (
        f"This role is described as: {jd[:200].strip()}. "
        "Given that context, tell me what specifically draws you to this position."
    )
    return [opener] + list(QUESTION_BANK)


# -- Persistence -----------------------------------------------------------


def _row_to_session(row: dict) -> dict[str, Any]:
    state = json.loads(row["state"]) if row.get("state") else {}
    state.setdefault("history", [])
    state.setdefault("llm_messages", [])
    state.setdefault("current_index", 0)
    state.setdefault("use_llm", False)
    state["jd"] = row.get("jd") or state.get("jd", "")
    state["role"] = row.get("role") or state.get("role", "")
    state["_summary"] = row.get("summary") or ""
    state["_complete"] = bool(row.get("complete"))
    state["_user_id"] = row.get("user_id")
    return state


def _load(session_id: str) -> Optional[dict[str, Any]]:
    cached = _SESSIONS.get(session_id)
    if cached is not None:
        return cached

    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, user_id, role, jd, state, summary, complete "
            "FROM interview_sessions WHERE id=%s",
            (session_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        session = _row_to_session(row)
        _SESSIONS[session_id] = session
        return session
    except Exception:
        logger.exception("Failed to load interview session %s", session_id)
        return None
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def _save(session_id: str, session: dict[str, Any]) -> None:
    """Insert-or-update the session row and refresh the cache."""
    _SESSIONS[session_id] = session

    persistable = {
        k: v for k, v in session.items()
        if not k.startswith("_")
    }
    state_json = json.dumps(persistable, ensure_ascii=False)

    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO interview_sessions
                (id, user_id, role, jd, state, summary, complete)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                state=VALUES(state),
                summary=VALUES(summary),
                complete=VALUES(complete)
            """,
            (
                session_id,
                session.get("_user_id"),
                (session.get("role") or "")[:255],
                session.get("jd") or "",
                state_json,
                session.get("_summary") or None,
                bool(session.get("_complete")),
            ),
        )
        conn.commit()
    except Exception:
        logger.exception("Failed to save interview session %s", session_id)
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# -- Public API ------------------------------------------------------------


def create_session(jd: str, role: Optional[str] = None, user_id: Optional[int] = None) -> dict:
    session_id = str(uuid.uuid4())
    use_llm = _llm_available()

    session: dict[str, Any] = {
        "jd": jd,
        "role": role or "",
        "history": [],
        "current_index": 0,
        "use_llm": use_llm,
        "llm_messages": [],
        "pending_question": "",
        "_user_id": user_id,
        "_summary": "",
        "_complete": False,
    }

    first_question = ""
    if use_llm:
        system_msg = _build_system_message(jd, role or "")
        session["llm_messages"] = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": "Please begin the interview with your first question."},
        ]
        try:
            raw, parsed = _chat_json(session["llm_messages"])
            first_question = parsed.get("question", "")
            session["llm_messages"].append({"role": "assistant", "content": raw})
        except Exception:
            logger.warning("LLM failed for first question; falling back to static bank.")
            session["use_llm"] = False
            first_question = ""

    if not session.get("use_llm") or not first_question:
        session["use_llm"] = False
        questions = _jd_questions(jd, role or "")
        session["questions"] = questions
        first_question = questions[0]

    session["pending_question"] = first_question

    _save(session_id, session)
    return {
        "session_id": session_id,
        "total_questions": _MAX_QUESTIONS,
        "first_question": first_question,
    }


def get_next(session_id: str, answer: str) -> dict:
    session = _load(session_id)
    if session is None:
        return {"error": "session_not_found"}
    if session.get("_complete"):
        return {"error": "session_complete"}

    if session.get("use_llm"):
        result = _get_next_llm(session, answer)
    else:
        result = _get_next_static(session, answer)

    if "error" not in result:
        if result.get("complete"):
            session["_complete"] = True
            session["_summary"] = result.get("summary") or _generate_summary(session["history"])
        _save(session_id, session)

    return result


def _get_next_llm(session: dict, answer: str) -> dict:
    prev_question = session.get("pending_question", "")
    session["llm_messages"].append(
        {"role": "user", "content": f"Candidate's answer: {answer}"}
    )

    try:
        raw, parsed = _chat_json(session["llm_messages"])
        session["llm_messages"].append({"role": "assistant", "content": raw})
    except Exception:
        logger.warning("LLM failed during interview; returning fallback.")
        # Still record the answer so the transcript stays complete.
        session["history"].append({
            "question": prev_question,
            "answer": answer,
            "feedback": "",
        })
        fallback_q = "Can you tell me about a recent accomplishment you're proud of?"
        session["pending_question"] = fallback_q
        return {
            "feedback": "Good answer! Let me think of my next question...",
            "question_number": len(session["history"]),
            "total_questions": _MAX_QUESTIONS,
            "complete": False,
            "next_question": fallback_q,
        }

    feedback = (parsed.get("feedback") or "").strip()
    question = (parsed.get("question") or "").strip()
    is_complete = parsed.get("complete", False)
    summary = (parsed.get("summary") or "").strip()

    # A weak model sometimes returns empty/curt feedback. Backfill with the
    # deterministic heuristic so the candidate always gets useful coaching.
    if len(feedback) < 15:
        feedback = _generate_feedback(prev_question, answer)

    idx = len(session["history"])

    # If the model forgot to ask a next question mid-interview, pull one from
    # the static bank instead of sending the user an empty turn.
    if not is_complete and not question and idx + 1 < _MAX_QUESTIONS:
        question = QUESTION_BANK[idx % len(QUESTION_BANK)]
    # H3 - keep the same history shape as the static path (question included).
    session["history"].append({
        "question": prev_question,
        "answer": answer,
        "feedback": feedback,
    })
    session["pending_question"] = question

    if is_complete or idx + 1 >= _MAX_QUESTIONS:
        return {
            "question_number": idx + 1,
            "total_questions": _MAX_QUESTIONS,
            "feedback": feedback,
            "complete": True,
            "summary": summary or _generate_summary(session["history"]),
        }

    return {
        "question_number": idx + 1,
        "total_questions": _MAX_QUESTIONS,
        "feedback": feedback,
        "complete": False,
        "next_question": question,
    }


def _get_next_static(session: dict, answer: str) -> dict:
    idx = session["current_index"]
    questions = session["questions"]

    if idx >= len(questions):
        return {"error": "session_complete"}

    current_question = questions[idx]
    feedback = _generate_feedback(current_question, answer)

    session["history"].append({
        "question": current_question,
        "answer": answer,
        "feedback": feedback,
    })
    session["current_index"] = idx + 1

    is_last = session["current_index"] >= len(questions)
    next_question = questions[session["current_index"]] if not is_last else ""
    session["pending_question"] = next_question

    result: dict[str, Any] = {
        "question_number": idx + 1,
        "total_questions": len(questions),
        "feedback": feedback,
        "complete": is_last,
    }

    if not is_last:
        result["next_question"] = next_question
    else:
        result["summary"] = _generate_summary(session["history"])

    return result


def get_session(session_id: str) -> dict:
    session = _load(session_id)
    if session is None:
        return {"error": "session_not_found"}

    idx = session["current_index"] if not session.get("use_llm") else len(session["history"])
    total = len(session.get("questions", [])) if not session.get("use_llm") else _MAX_QUESTIONS
    is_complete = bool(session.get("_complete")) or idx >= total

    return {
        "session_id": session_id,
        "role": session["role"],
        "question_number": idx + 1 if not is_complete else total,
        "total_questions": total,
        "complete": is_complete,
        "history": session["history"],
        "summary": session.get("_summary", ""),
    }


def end_session(session_id: str) -> dict:
    session = _load(session_id)
    if session is None:
        return {"error": "session_not_found"}

    summary = session.get("_summary") or _generate_summary(session["history"])
    session["_complete"] = True
    session["_summary"] = summary
    _save(session_id, session)

    return {
        "session_id": session_id,
        "questions_answered": len(session["history"]),
        "summary": summary,
    }


def list_sessions(user_id: Optional[int], limit: int = 20) -> list[dict]:
    """Recent interview sessions for the History page (H2)."""
    conn, cur = None, None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            """
            SELECT id, role, jd, summary, complete, created_at
            FROM interview_sessions
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (user_id, max(1, min(limit, 100))),
        )
        rows = cur.fetchall()
        return [
            {
                "session_id": row["id"],
                "role": row.get("role") or "",
                "complete": bool(row.get("complete")),
                "summary": row.get("summary") or "",
                "created_at": str(row.get("created_at")),
            }
            for row in rows
        ]
    except Exception:
        logger.exception("Failed to list interview sessions for user %s", user_id)
        return []
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def _generate_feedback(question: str, answer: str) -> str:
    answer = (answer or "").strip()
    if len(answer) < 20:
        return (
            "Your answer was very brief. Try to elaborate with a specific example or context."
        )
    if len(answer) < 80:
        return (
            "Good start. Consider adding more detail - a concrete example or measurable "
            "outcome strengthens your answer."
        )
    if any(
        word in answer.lower()
        for word in ("example", "project", "result", "achieved", "improved", "led")
    ):
        return (
            "Strong answer. You used specific examples effectively, which is exactly what "
            "interviewers look for."
        )
    return (
        "Solid response. Where possible, tie your answer to a specific outcome or metric "
        "to make it more memorable."
    )


def _generate_summary(history: list) -> str:
    if not history:
        return "No answers recorded."
    total = len(history)
    strong = sum(
        1
        for h in history
        if len(h.get("answer", "")) >= 80
        and any(
            w in h["answer"].lower()
            for w in ("example", "project", "result", "achieved", "improved", "led")
        )
    )
    return (
        f"You answered {total} question(s). "
        f"{strong} of them included strong specific examples. "
        "Focus on adding measurable outcomes to any answers that felt vague."
    )
