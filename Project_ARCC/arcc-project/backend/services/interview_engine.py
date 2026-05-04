"""
LLM-powered interview session engine.

Uses Gemini (OpenAI-compat) for dynamic questions, follow-ups, and feedback.
Falls back to a static question bank when no LLM key is configured.
Sessions live in a module-level dict and are lost on server restart.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Optional

import requests

from config import Config

logger = logging.getLogger(__name__)

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
    "You are a professional, friendly interview coach named ARCC. "
    "You are conducting a mock interview for the candidate.\n\n"
    "RULES:\n"
    "- Ask ONE question at a time. Keep questions concise (1-2 sentences).\n"
    "- After the candidate answers, give brief encouraging feedback (2-3 sentences max), "
    "then ask the next question.\n"
    "- Mix behavioral, situational, and role-specific questions based on the job description.\n"
    "- Adapt follow-up questions based on the candidate's answers.\n"
    "- Be warm and professional — this is coaching, not grilling.\n"
    "- After {max_q} questions, wrap up with a brief overall summary and tips.\n\n"
    "RESPONSE FORMAT — always reply with this exact JSON structure:\n"
    '{{"feedback": "your feedback on their answer (empty string for first question)", '
    '"question": "your next question (empty string when interview is complete)", '
    '"complete": false, '
    '"summary": "only populated when complete is true — 3-4 sentence overall assessment"}}\n\n'
    "JOB DESCRIPTION:\n{jd}\n\n"
    "ROLE: {role}"
).replace("{max_q}", str(_MAX_QUESTIONS))


def _llm_available() -> bool:
    return bool(Config.LLM_API_KEY and Config.LLM_API_KEY.strip())


def _chat_completion(messages: list[dict[str, str]]) -> str:
    url = f"{Config.LLM_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {Config.LLM_API_KEY.strip()}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": Config.LLM_MODEL,
        "messages": messages,
        "temperature": 0.55,
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=_REQUEST_TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    return (data["choices"][0]["message"].get("content") or "").strip()


def _parse_llm_response(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    return json.loads(text)


def _build_system_message(jd: str, role: str) -> str:
    return SYSTEM_PROMPT.format(jd=jd[:2000].strip(), role=role or "General")


def _jd_questions(jd: str, role: str) -> list[str]:
    opener = (
        f"This role is described as: {jd[:200].strip()}. "
        "Given that context, tell me what specifically draws you to this position."
    )
    return [opener] + list(QUESTION_BANK)


# ─── Public API ───────────────────────────────────────────────


def create_session(jd: str, role: Optional[str] = None) -> dict:
    session_id = str(uuid.uuid4())
    use_llm = _llm_available()

    session: dict[str, Any] = {
        "jd": jd,
        "role": role or "",
        "history": [],
        "current_index": 0,
        "use_llm": use_llm,
        "llm_messages": [],
    }

    if use_llm:
        system_msg = _build_system_message(jd, role or "")
        session["llm_messages"] = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": "Please begin the interview with your first question."},
        ]
        try:
            raw = _chat_completion(session["llm_messages"])
            parsed = _parse_llm_response(raw)
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

    _SESSIONS[session_id] = session
    return {
        "session_id": session_id,
        "total_questions": _MAX_QUESTIONS,
        "first_question": first_question,
    }


def get_next(session_id: str, answer: str) -> dict:
    session = _SESSIONS.get(session_id)
    if session is None:
        return {"error": "session_not_found"}

    if session.get("use_llm"):
        return _get_next_llm(session, answer)
    return _get_next_static(session, answer)


def _get_next_llm(session: dict, answer: str) -> dict:
    session["llm_messages"].append(
        {"role": "user", "content": f"Candidate's answer: {answer}"}
    )

    try:
        raw = _chat_completion(session["llm_messages"])
        parsed = _parse_llm_response(raw)
        session["llm_messages"].append({"role": "assistant", "content": raw})
    except Exception:
        logger.warning("LLM failed during interview; returning fallback.")
        return {
            "feedback": "Good answer! Let me think of my next question...",
            "question_number": len(session["history"]) + 1,
            "total_questions": _MAX_QUESTIONS,
            "complete": False,
            "next_question": "Can you tell me about a recent accomplishment you're proud of?",
        }

    feedback = parsed.get("feedback", "")
    question = parsed.get("question", "")
    is_complete = parsed.get("complete", False)
    summary = parsed.get("summary", "")

    idx = len(session["history"])
    session["history"].append({
        "answer": answer,
        "feedback": feedback,
    })

    if is_complete or idx + 1 >= _MAX_QUESTIONS:
        result = {
            "question_number": idx + 1,
            "total_questions": _MAX_QUESTIONS,
            "feedback": feedback,
            "complete": True,
            "summary": summary or _generate_summary(session["history"]),
        }
    else:
        result = {
            "question_number": idx + 1,
            "total_questions": _MAX_QUESTIONS,
            "feedback": feedback,
            "complete": False,
            "next_question": question,
        }

    return result


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
    session = _SESSIONS.get(session_id)
    if session is None:
        return {"error": "session_not_found"}

    idx = session["current_index"] if not session.get("use_llm") else len(session["history"])
    total = len(session.get("questions", [])) if not session.get("use_llm") else _MAX_QUESTIONS
    is_complete = idx >= total

    return {
        "session_id": session_id,
        "role": session["role"],
        "question_number": idx + 1 if not is_complete else total,
        "total_questions": total,
        "complete": is_complete,
        "history": session["history"],
    }


def end_session(session_id: str) -> dict:
    if session_id not in _SESSIONS:
        return {"error": "session_not_found"}
    session = _SESSIONS.pop(session_id)
    return {
        "session_id": session_id,
        "questions_answered": len(session["history"]),
        "summary": _generate_summary(session["history"]),
    }


def _generate_feedback(question: str, answer: str) -> str:
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
