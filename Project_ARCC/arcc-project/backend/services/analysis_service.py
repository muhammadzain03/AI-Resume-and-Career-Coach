"""
Deterministic resume -> job overlap (hybrid baseline for Phase 2).
Used as fallback when the LLM fails and to seed matched / missing token (words) lists.

Acting as a backup when the LLM fails, providing initial matched/missing terms, giving a consistent non-AI score
"""

import re

# Common words that are usually not useful for skill matching.
_STOP = {
    "the", "and", "for", "with", "from", "that", "this", "your", "you", "are",
    "was", "have", "has", "will", "job", "role", "work", "team", "years", "year",
    "our", "their", "they", "an", "a", "to", "of", "in", "on", "at", "as", "or",
    "be", "by", "we", "us", "all", "any", "can", "may", "must", "should", "would",
}

_TECH_ALLOWLIST = {
    # ── Programming languages
    "c",
    "r",
    "go",

    # ── AI / ML / Data
    "ai",
    "ml",
    "dl",
    "nlp",
    "cv",
    "bi",
    "etl",
    "kpi",

    # ── Software / Web / Systems
    "ui",
    "ux",
    "api",
    "sdk",
    "cli",
    "orm",
    "mvc",
    "ci",
    "cd",
    "db",
    "os",
    "vm",
    "io",

    # ── Networking / Security
    "it",
    "vpn",
    "dns",
    "tcp",
    "ssl",
    "tls",
    "iam",
    "sso",
    "mfa",

    # ── Cloud / Infrastructure
    "aws",
    "gcp",

    # ── Quality / Testing
    "qa",
    "qc",
    "tdd",
    "bdd",

    # ── Project / Process
    "pm",
    "po",
    "ba",
    "erp",
    "crm",
    "hr",
    "sla",
    "okr",
    "roi",

    # ── Finance / Accounting
    "p&l",
    "m&a",
    "ar",
    "ap",
    "fx",
    "ipo",
    "npv",
    "irr",
    "esg",

    # ── Healthcare / Science
    "ehr",
    "emr",
    "icu",
    "er",
    "rn",
    "md",
    "np",
    "irb",
    "fda",
    "ppe",
    "iv",

    # ── Engineering / Manufacturing
    "cad",
    "cam",
    "plc",
    "cnc",
    "bom",
    "iso",
    "sop",

    # ── Legal / Compliance
    "gdpr",
    "hipaa",
    "kyc",
    "aml",
    "ip",

    # ── Education
    "k12",
    "ell",
    "iep",
    "lms",
    "stem",

    # ── Marketing / Design
    "seo",
    "sem",
    "ctr",
    "cpm",
    "cpa",
    "b2b",
    "b2c",
    "saas",
    "cro",
    "or",
}


def _tokens(text: str) -> set:
    if not text:
        return set()
    # .lower() runs first so A-Z is redundant — everything is already lowercase.
    # & is included so p&l and m&a are captured as single tokens.
    words = re.findall(r"[a-z][a-z0-9+#.\-&]*", text.lower())
    return {w for w in words if w not in _STOP and (len(w) > 1 or w in _TECH_ALLOWLIST)}


def analyze_resume_against_job(resume_text: str, job_description: str) -> dict:
    r = _tokens(resume_text)
    j = _tokens(job_description)

    if not j:
        return {
            "match_score": 0.0,
            "matched_skills": [],
            "missing_skills": [],
        }

    matched = sorted(r.intersection(j))
    missing = sorted(j.difference(r))
    score = round((len(matched) / max(len(j), 1)) * 100, 2)

    return {
        "match_score": float(score),
        "matched_skills": matched[:80],
        "missing_skills": missing[:80],
    }
