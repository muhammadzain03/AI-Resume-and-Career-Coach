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
_REQUEST_TIMEOUT = 60

# ---------------------------------------------------------------------------
# Fallback suggestions (used when LLM is unavailable)
# ---------------------------------------------------------------------------
_FALLBACK_SUGGESTIONS = [
    {
        "category": "Impact Metrics",
        "section": "Experience",
        "text": "Add measurable outcomes (metrics, scale, timelines) to your strongest bullet points. For example, change 'Improved performance' to 'Improved API response time by 40%, reducing p95 latency from 800ms to 480ms'.",
        "priority": "high",
    },
    {
        "category": "Missing Keyword",
        "section": "Experience",
        "text": "Mirror important job keywords naturally in your experience section so ATS systems can pick them up.",
        "priority": "high",
    },
    {
        "category": "Bullet Improvement",
        "section": "Projects",
        "text": "Surface projects that directly match the role's technical requirements and describe them with action + context + result (STAR-style) wording.",
        "priority": "medium",
    },
    {
        "category": "Section Order",
        "section": "Skills",
        "text": "Move the most relevant skills and tools closer to the top of the resume so recruiters see them first.",
        "priority": "medium",
    },
    {
        "category": "Formatting",
        "section": "General",
        "text": "Replace vague phrases like 'Worked on' or 'Helped with' with strong action verbs such as 'Engineered', 'Architected', or 'Optimized'.",
        "priority": "low",
    },
]

_SCORE_WEIGHTS = {
    "keyword_match": 0.30,
    "formatting": 0.15,
    "spelling_grammar": 0.15,
    "impact_metrics": 0.25,
    "section_order": 0.15,
}

STOPWORDS = set([
    "is", "are", "the", "of", "and", "or", "a", "about", "an", "into", "for", "with",
    "as", "at", "on", "in", "by", "from", "to", ".", ",", "ll", "re", "include",
    "product", "part", "original", "high", "large", "next", "all", "description",
    "experience", "education", "skills", "projects", "across", "using", "used",
    "work", "working", "team", "role", "job", "year", "years", "professional",
    "strong", "excellent", "good", "best", "practices", "knowledge", "ability",
    "understanding", "communication", "leadership", "development", "management",
    "environment", "application", "system", "process", "service", "support",
    "information", "technology", "quality", "standard", "business", "customer",
    "client", "solution", "tools", "platform", "framework", "engineering",
    "software", "hardware", "performance", "operations", "strategy",
    "learning", "training", "analysis", "report", "reporting", "documentation",
    "building", "maintaining", "testing", "design", "implementation",
    "deployment", "delivery", "improvement", "research", "collaboration",
    "initiative", "profile", "technical", "detail",
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
    base_score = overlap["match_score"]
    return {
        "match_score": base_score,
        "score_breakdown": {
            "keyword_match": round(base_score),
            "formatting": 50,
            "spelling_grammar": 50,
            "impact_metrics": 50,
            "section_order": 50,
        },
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


def _coerce_suggestion(raw: Any) -> dict | None:
    """Normalize a suggestion into the structured format."""
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            return None
        return {
            "category": "General",
            "section": "General",
            "text": s,
            "priority": "medium",
        }
    if isinstance(raw, dict):
        text = str(raw.get("text", "")).strip()
        if not text:
            return None
        return {
            "category": str(raw.get("category", "General")).strip() or "General",
            "section": str(raw.get("section", "General")).strip() or "General",
            "text": text,
            "priority": str(raw.get("priority", "medium")).strip().lower() or "medium",
        }
    return None


def _compute_overall(breakdown: dict, baseline: float) -> float:
    """Weighted average of sub-scores, blended with deterministic baseline."""
    total = 0.0
    for key, weight in _SCORE_WEIGHTS.items():
        val = breakdown.get(key)
        if val is None:
            val = baseline if key == "keyword_match" else 50
        total += float(val) * weight
    blended = 0.3 * baseline + 0.7 * total
    return round(max(0, min(100, blended)), 2)


def _coerce_analysis_payload(raw: dict[str, Any], overlap: dict) -> dict | None:
    try:
        raw_breakdown = raw.get("score_breakdown") or {}
        breakdown = {}
        for key in _SCORE_WEIGHTS:
            val = raw_breakdown.get(key)
            if val is not None:
                breakdown[key] = max(0, min(100, float(val)))
            elif key == "keyword_match":
                breakdown[key] = float(overlap["match_score"])
            else:
                breakdown[key] = 50.0

        base = float(overlap["match_score"])
        match_score = _compute_overall(breakdown, base)

        missing_skills = filter_skills(raw.get("missing_skills") or [])

        raw_suggestions = raw.get("suggestions") or []
        suggestions = []
        for s in raw_suggestions:
            coerced = _coerce_suggestion(s)
            if coerced:
                suggestions.append(coerced)
        suggestions = suggestions[:12]

        if not suggestions:
            return None

        if not missing_skills:
            missing_skills = filter_skills(overlap["missing_skills"])

        return {
            "match_score": match_score,
            "score_breakdown": breakdown,
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
    """Serialize the full analysis payload for one DB column."""
    return json.dumps(
        {
            "matched_skills": payload.get("matched_skills", []),
            "missing_skills": payload.get("missing_skills", []),
            "suggestions": payload.get("suggestions", []),
            "score_breakdown": payload.get("score_breakdown", {}),
        },
        ensure_ascii=False,
    )


def unpack_analysis_from_db(raw: str | None) -> dict:
    """Reverse of pack_analysis_for_db. Supports legacy plain-text rows."""
    empty = {
        "matched_skills": [],
        "missing_skills": [],
        "suggestions": [],
        "score_breakdown": {},
    }
    if not raw or not str(raw).strip():
        return empty

    text = str(raw).strip()
    if text.startswith("{"):
        try:
            data = json.loads(text)
            suggestions = []
            for s in (data.get("suggestions") or []):
                coerced = _coerce_suggestion(s)
                if coerced:
                    suggestions.append(coerced)

            return {
                "matched_skills": list(data.get("matched_skills") or []),
                "missing_skills": list(data.get("missing_skills") or []),
                "suggestions": suggestions,
                "score_breakdown": data.get("score_breakdown") or {},
            }
        except json.JSONDecodeError:
            pass

    lines = [s.strip() for s in text.split("\n") if s.strip()]
    legacy_suggestions = []
    for line in lines:
        coerced = _coerce_suggestion(line)
        if coerced:
            legacy_suggestions.append(coerced)
    return {
        "matched_skills": [],
        "missing_skills": [],
        "suggestions": legacy_suggestions,
        "score_breakdown": {},
    }


def analyze_resume_job(resume_text: str, job_description: str) -> dict:
    """
    Hybrid overlap + LLM analysis with multi-dimensional scoring
    and structured, section-specific suggestions.
    """
    resume_text = (resume_text or "").strip()
    job_description = (job_description or "").strip()
    overlap = analyze_resume_against_job(resume_text, job_description)

    if not Config.LLM_API_KEY or not Config.LLM_API_KEY.strip():
        return _fallback_bundle(overlap)

    r_short = resume_text[:_MAX_CHARS]
    j_short = job_description[:_MAX_CHARS]

    system = (
        "You are an expert resume analyst. Compare the resume against the job description.\n\n"
        "Return ONE JSON object with this exact schema (no markdown, no prose):\n"
        "{\n"
        '  "score_breakdown": {\n'
        '    "keyword_match": <0-100>,\n'
        '    "formatting": <0-100>,\n'
        '    "spelling_grammar": <0-100>,\n'
        '    "impact_metrics": <0-100>,\n'
        '    "section_order": <0-100>\n'
        "  },\n"
        '  "missing_skills": ["string", ...],\n'
        '  "suggestions": [\n'
        "    {\n"
        '      "category": "Section Order | Bullet Improvement | Missing Keyword | Formatting | Spelling | Impact Metrics",\n'
        '      "section": "which resume section (e.g. Skills, Experience > Job Title, Projects > Project Name, Education)",\n'
        '      "text": "specific actionable instruction with before/after examples where applicable",\n'
        '      "priority": "high | medium | low"\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "SCORING RULES:\n"
        "- keyword_match: % of technical skills/tools/languages from the JD found in the resume. "
        "Only count real technical terms (languages, frameworks, tools, platforms, certifications, methodologies). "
        "Ignore generic English words.\n"
        "- formatting: consistent bullet style, proper section headers, appropriate length (1-2 pages), "
        "clean whitespace, no walls of text.\n"
        "- spelling_grammar: typos, grammatical errors, inconsistent tense, missing articles.\n"
        "- impact_metrics: presence of quantifiable results (numbers, percentages, dollar amounts, scale). "
        "Score low if bullets say 'Worked on X' without measurable outcomes.\n"
        "- section_order: sections ordered appropriately for career level "
        "(junior: Education then Experience; senior: Experience first). "
        "Skills section positioned for maximum visibility.\n\n"
        "SUGGESTION RULES:\n"
        "- Provide 5-12 suggestions, each referencing a SPECIFIC section and location in the resume.\n"
        "- For Bullet Improvement, quote the original bullet text and show an improved version.\n"
        "- For Section Order, say exactly which section to move and where.\n"
        "- For Missing Keyword, say where to naturally weave in the missing term.\n"
        "- For Formatting issues, describe exactly what to fix.\n"
        "- For Spelling issues, quote the error and the correction.\n"
        "- missing_skills: only real technical terms (tools, languages, frameworks, platforms, certifications). "
        "Do NOT include generic words like 'experience', 'knowledge', 'skills'.\n"
        "- Scale: 0-40 unrelated, 40-70 partial match, 70-90 good, 90-100 near-perfect.\n"
    )

    user = (
        f"Baseline keyword overlap (hint only): {overlap['match_score']}%. "
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
