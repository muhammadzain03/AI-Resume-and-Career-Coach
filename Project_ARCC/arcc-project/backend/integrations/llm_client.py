from __future__ import annotations
import json
import logging
import re
from typing import Any
import requests

from config import Config
from services.analysis_service import analyze_resume_against_job

logger = logging.getLogger(__name__)

_MAX_CHARS = 12_000
_REQUEST_TIMEOUT = 45

_FALLBACK_SUGGESTIONS = [
    "Add measurable outcomes (metrics, scale, timelines) to your strongest bullets.",
    "Mirror important job keywords naturally in your experience section.",
    "Surface projects that directly match the role's technical requirements.",
    "Move the most relevant skills and tools closer to the top of the resume.",
    "Replace vague phrases with action + context + result (STAR-style) wording.",
]

STOPWORDS = set([
    "is", "are", "the", "of", "and", "or", "a", "about", "an", "into", "for", "with",
    "as", "at", "on", "in", "by", "from", "to", ".", ",", "ll", "re", "include",
    "product", "part", "original", "high", "large", "next", "all", "description",
])

def filter_skills(skills: list[str]) -> list[str]:
    filtered = []
    for s in skills:
        s_clean = s.strip().lower()
        if not s_clean or s_clean in STOPWORDS or len(s_clean) < 3:
            continue
        filtered.append(s)
    return filtered[:50]

def _fallback_bundle(overlap: dict) -> dict:
    return {
        "match_score": overlap["match_score"],
        "matched_skills": overlap["matched_skills"],
        "missing_skills": filter_skills(overlap["missing_skills"]),
        "suggestions": list(_FALLBACK_SUGGESTIONS),
    }

def _extract_json_object(text: str) -> dict[str, Any]:
    text = (text or "").strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()
    return json.loads(text)

def _coerce_analysis_payload(raw: dict[str, Any], overlap: dict) -> dict | None:
    try:
        ms = raw.get("match_score")
        llm_score = float(ms) if ms is not None else None

        missing_skills = filter_skills(raw.get("missing_skills") or [])
        suggestions = [str(x).strip() for x in raw.get("suggestions") or [] if str(x).strip()][:5]

        if not suggestions:
            return None

        base = float(overlap["match_score"])
        match_score = round(0.2 * base + 0.8 * llm_score, 2) if llm_score else base

        if not missing_skills:
            missing_skills = filter_skills(overlap["missing_skills"])

        return {
            "match_score": match_score,
            "matched_skills": overlap["matched_skills"],
            "missing_skills": missing_skills,
            "suggestions": suggestions,
        }
    except (TypeError, ValueError):
        return None

def _chat_completion(messages: list[dict[str, str]]) -> str:
    url = f"{Config.LLM_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {Config.LLM_API_KEY.strip()}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": Config.LLM_MODEL,
        "messages": messages,
        "temperature": 0.35,
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=_REQUEST_TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    return (data["choices"][0]["message"].get("content") or "").strip()

def pack_analysis_for_db(payload: dict) -> str:
    """
    Serialize skills + suggestions for one DB column (analysis_results.suggestions).
    """
    return json.dumps(
        {
            "matched_skills": payload.get("matched_skills", []),
            "missing_skills": payload.get("missing_skills", []),
            "suggestions": payload.get("suggestions", []),
        },
        ensure_ascii=False,
    )

def unpack_analysis_from_db(raw: str | None) -> dict:
    """
    Reverse of pack_analysis_for_db.
    Supports older legacy strings (plain lines) too.
    """
    if not raw or not str(raw).strip():
        return {"matched_skills": [], "missing_skills": [], "suggestions": []}

    text = str(raw).strip()
    if text.startswith("{"):
        try:
            data = json.loads(text)
            return {
                "matched_skills": list(data.get("matched_skills") or []),
                "missing_skills": list(data.get("missing_skills") or []),
                "suggestions": list(data.get("suggestions") or []),
            }
        except json.JSONDecodeError:
            pass

    lines = [s.strip() for s in text.split("\n") if s.strip()]
    return {"matched_skills": [], "missing_skills": [], "suggestions": lines}

def analyze_resume_job(resume_text: str, job_description: str) -> dict:
    """
    Hybrid overlap + LLM analysis.
    Filters meaningless keywords and provides actionable suggestions.
    """
    resume_text = (resume_text or "").strip()
    job_description = (job_description or "").strip()
    overlap = analyze_resume_against_job(resume_text, job_description)

    if not Config.LLM_API_KEY or not Config.LLM_API_KEY.strip():
        return _fallback_bundle(overlap)

    r_short = resume_text[:_MAX_CHARS]
    j_short = job_description[:_MAX_CHARS]

    system = (
        "You are an expert resume analyst. Analyze the resume vs job description.\n"
        "- Only include meaningful technical, domain, or actionable soft skills missing from the resume.\n"
        "- Categorize missing skills: tools, programming languages, frameworks/platforms, domain terms, soft/process skills.\n"
        "- Provide up to 5 actionable suggestions in STAR-style (Action + Context + Result).\n"
        "- Ignore generic words, stop words, and repeated common English words.\n"
        "- Merge your match_score with baseline overlap for stability.\n"
        "- Be generous with scoring; it's a hint, not a strict metric.\n"
        "- Scoring should be holistic, not just keyword matching. Consider relevance and context.\n"
        "- Scoring scale: 0-40 for unrelated resumes, 40-70 for somewhat relevant, 70-90 for good matches, 90-100 for near-perfect.\n"
        "Reply with ONE JSON object only, no markdown or prose.\n"
        'Schema: {"match_score": number 0-100, "missing_skills": string[], "suggestions": string[] (max 5)}.'
    )

    user = (
        f"Baseline token overlap score (hint only): {overlap['match_score']}. "
        f"Baseline missing tokens (hint): {overlap['missing_skills'][:30]}\n\n"
        f"RESUME:\n{r_short}\n\nJOB DESCRIPTION:\n{j_short}"
    )

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]

    try:
        content = _chat_completion(messages)
        parsed = _extract_json_object(content)
        merged = _coerce_analysis_payload(parsed, overlap)
        if merged:
            return merged
    except (requests.RequestException, json.JSONDecodeError):
        logger.warning("LLM failed; using fallback analysis.")

    return _fallback_bundle(overlap)