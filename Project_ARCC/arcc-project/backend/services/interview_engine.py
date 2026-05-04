"""
In-memory interview session engine (Phase 5 — F-07).

Sessions live in a module-level dict and are lost on server restart.
Team: do not rely on sessions across deploys or Gunicorn worker restarts.
"""

from __future__ import annotations

import uuid
from typing import Any, Optional

# session_id -> session dict
_SESSIONS: dict[str, dict[str, Any]] = {}

QUESTION_BANK = [
    "Tell me about yourself and why you are interested in this role.",
    "What is your greatest professional strength and how have you applied it?",
    "Describe a challenging project you worked on and how you handled it.",
    "How do you prioritize tasks when working under pressure or tight deadlines?",
    "Give an example of a time you worked effectively in a team.",
    "What is a weakness you have identified and what are you doing to improve it?",
    "Where do you see yourself professionally in the next three to five years?",
    "Why are you leaving your current role or why are you looking for a new opportunity?",
    "Describe a situation where you had to learn something new quickly.",
    "Do you have any questions for us?",
]


def _jd_questions(jd: str, role: str) -> list[str]:
    """
    Question list from JD/role. Static bank + JD-aware opener.
    Swap in an LLM call later if you want dynamic questions.
    """
    opener = (
        f"This role is described as: {jd[:200].strip()}. "
        "Given that context, tell me what specifically draws you to this position."
    )
    return [opener] + list(QUESTION_BANK)


def create_session(jd: str, role: Optional[str] = None) -> dict:
    """Start a new interview session."""
    session_id = str(uuid.uuid4())
    questions = _jd_questions(jd, role or "")
    _SESSIONS[session_id] = {
        "jd": jd,
        "role": role or "",
        "questions": questions,
        "history": [],
        "current_index": 0,
    }
    return {
        "session_id": session_id,
        "total_questions": len(questions),
        "first_question": questions[0],
    }


def get_next(session_id: str, answer: str) -> dict:
    """Submit an answer for the current question; returns feedback and next step."""
    session = _SESSIONS.get(session_id)
    if session is None:
        return {"error": "session_not_found"}

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

    result: dict[str, Any] = {
        "question_number": idx + 1,
        "total_questions": len(questions),
        "feedback": feedback,
        "complete": is_last,
    }

    if not is_last:
        result["next_question"] = questions[session["current_index"]]
    else:
        result["summary"] = _generate_summary(session["history"])

    return result


def get_session(session_id: str) -> dict:
    """Current session state (refresh / resume UI)."""
    session = _SESSIONS.get(session_id)
    if session is None:
        return {"error": "session_not_found"}

    idx = session["current_index"]
    questions = session["questions"]
    is_complete = idx >= len(questions)

    return {
        "session_id": session_id,
        "role": session["role"],
        "question_number": idx + 1 if not is_complete else len(questions),
        "total_questions": len(questions),
        "complete": is_complete,
        "current_question": None if is_complete else questions[idx],
        "history": session["history"],
    }


def end_session(session_id: str) -> dict:
    """Remove session from memory and return a short summary."""
    if session_id not in _SESSIONS:
        return {"error": "session_not_found"}
    session = _SESSIONS.pop(session_id)
    return {
        "session_id": session_id,
        "questions_answered": len(session["history"]),
        "summary": _generate_summary(session["history"]),
    }


def _generate_feedback(question: str, answer: str) -> str:
    """Rule-based feedback; replace with LLM later if needed."""
    answer = (answer or "").strip()
    if len(answer) < 20:
        return (
            "Your answer was very brief. Try to elaborate with a specific example or context."
        )
    if len(answer) < 80:
        return (
            "Good start. Consider adding more detail — a concrete example or measurable "
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
