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

# A weak model is more reliable at low temperature on structured output.
_ANALYSIS_TEMPERATURE = 0.2

# Priority ordering so the most important suggestions surface first.
_PRIORITY_RANK = {"high": 0, "medium": 1, "low": 2}

# Detects quantified achievements: 40%, $2M, 1,200 users, 3x, 10k, "by 25".
_QUANT_RE = re.compile(
    r"(\d+\s?%|\$\s?\d|\d[\d,]*\s?(k|m|bn|x|hrs?|days?|users?|customers?|requests?)\b|\bby\s+\d|\d[\d,]{2,})",
    re.IGNORECASE,
)


def _clean_text(text: str) -> str:
    """Strip control chars and collapse whitespace so the model sees clean input."""
    if not text:
        return ""
    text = text.replace("\x00", " ")
    # Collapse runs of blank lines / spaces but keep single newlines for structure.
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _count_quantified_bullets(resume_text: str) -> int:
    """Deterministic count of resume lines that contain a real metric.

    Used to ground the LLM's impact_metrics score in reality - a weak model
    often over- or under-rates this, so we bound it with a hard signal.
    """
    count = 0
    for line in (resume_text or "").splitlines():
        line = line.strip()
        if len(line) < 12:
            continue
        if _QUANT_RE.search(line):
            count += 1
    return count

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


def _coerce_analysis_payload(
    raw: dict[str, Any], overlap: dict, quantified: int = 0
) -> dict | None:
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

        # Ground keyword_match in the deterministic overlap so a weak model
        # can't drift too far from the real keyword reality.
        det_kw = float(overlap["match_score"])
        breakdown["keyword_match"] = round(
            0.5 * breakdown["keyword_match"] + 0.5 * det_kw, 2
        )

        # Bound impact_metrics by the real count of quantified bullets - the
        # single most-hallucinated sub-score on a low-end model.
        if quantified <= 0:
            breakdown["impact_metrics"] = min(breakdown["impact_metrics"], 45.0)
        elif quantified >= 4:
            breakdown["impact_metrics"] = max(breakdown["impact_metrics"], 60.0)

        base = det_kw
        match_score = _compute_overall(breakdown, base)

        missing_skills = filter_skills(raw.get("missing_skills") or [])

        raw_suggestions = raw.get("suggestions") or []
        suggestions = []
        seen = set()
        for s in raw_suggestions:
            coerced = _coerce_suggestion(s)
            if not coerced:
                continue
            # Drop near-duplicates and vague one-liners a weak model tends to emit.
            text = coerced["text"]
            key = text.lower()[:60]
            if key in seen or len(text) < 15:
                continue
            seen.add(key)
            if coerced["priority"] not in _PRIORITY_RANK:
                coerced["priority"] = "medium"
            suggestions.append(coerced)

        # Most important first.
        suggestions.sort(key=lambda s: _PRIORITY_RANK.get(s["priority"], 1))
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


def _chat_completion(
    messages: list[dict[str, str]],
    json_mode: bool = True,
    temperature: float = _ANALYSIS_TEMPERATURE,
) -> str:
    url = f"{Config.LLM_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {Config.LLM_API_KEY.strip()}",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {
        "model": Config.LLM_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        # Gemini's OpenAI-compatible endpoint honours structured output. This
        # makes _extract_json_object succeed far more often, so real analysis
        # shows up instead of the generic fallback bundle.
        payload["response_format"] = {"type": "json_object"}
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
    resume_text = _clean_text(resume_text)
    job_description = _clean_text(job_description)
    overlap = analyze_resume_against_job(resume_text, job_description)
    quantified = _count_quantified_bullets(resume_text)

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
        "- Scale: 0-40 unrelated, 40-70 partial match, 70-90 good, 90-100 near-perfect.\n\n"
        "EXAMPLE of one well-formed suggestion object (match this shape and specificity):\n"
        '{"category": "Bullet Improvement", "section": "Experience > Backend Engineer", '
        '"text": "Rewrite \'Worked on the payments API\' as \'Built a payments API handling '
        '12k req/min, cutting checkout errors 30%\'.", "priority": "high"}\n'
    )

    user = (
        f"DETERMINISTIC HINTS (ground your scores in these, do not contradict them):\n"
        f"- Keyword overlap: {overlap['match_score']}%\n"
        f"- Keywords in the JD missing from the resume: {overlap['missing_skills'][:30]}\n"
        f"- Resume bullets containing a real metric/number: {quantified}\n\n"
        f"RESUME:\n{r_short}\n\nJOB DESCRIPTION:\n{j_short}"
    )

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]

    # One retry on a parse/transport flub before dropping to the fallback -
    # a single reroll fixes most flukes and keeps real analysis showing up.
    for attempt in range(2):
        try:
            content = _chat_completion(messages)
            parsed = _extract_json_object(content)
            merged = _coerce_analysis_payload(parsed, overlap, quantified)
            if merged:
                return merged
            logger.warning("LLM analysis payload unusable (attempt %d).", attempt + 1)
        except (requests.RequestException, json.JSONDecodeError):
            logger.warning("LLM call/parse failed (attempt %d).", attempt + 1)

    logger.warning("LLM analysis unavailable; using fallback analysis.")
    return _fallback_bundle(overlap)
