# RCC — core engine review & improvement plan

A code review of the **functional heart** of RCC — resume scoring/analysis and the interview
engine — with a prioritized, Cursor-ready plan to fix issues and upgrade quality. This is about
what the product *does*, not how the homepage looks.

**Reviewed (from the repo):**
- `backend/integrations/llm_client.py` — analysis orchestration (Gemini, OpenAI-compat)
- `backend/services/analysis_service.py` — deterministic keyword overlap
- `backend/services/interview_engine.py` — interview sessions + LLM/fallback
- `backend/services/resume_parser.py` — PDF/DOCX/TXT extraction
- `backend/routes/*` — analysis, interview, resume, auth
- `backend/database/init/01-schema.sql` — MySQL schema
- `backend/config.py`, `frontend/src/pages/AnalyzePage.js`, `frontend/src/components/InterviewChat.js`

**Stack reality check:** the DB is **MySQL** (`mysql-connector-python`, port 3306, `DB_NAME=arcc`),
the LLM is **Gemini** via the OpenAI-compatible endpoint (`gemini-2.5-flash`). ➜ **The marketing
tech-strip from the previous plan said "PostgreSQL" — change it to "MySQL".** Honest stack line:
`React · Flask · Gemini · MySQL`.

---

## What's already strong (keep these — don't "refactor" them away)

- **Hybrid scoring** in `analyze_resume_job`: a deterministic keyword-overlap baseline blended
  `0.3*baseline + 0.7*LLM` so the score can't hallucinate wildly off the keyword reality. This is
  a genuinely good design.
- **Defensive LLM handling:** `_coerce_analysis_payload`, `_coerce_suggestion`, `_extract_json_object`,
  and `_fallback_bundle` mean a malformed model reply degrades gracefully instead of 500-ing.
- **Curated `_STOP` + `_TECH_ALLOWLIST` + `_TECHNICAL_TERMS`** so short acronyms (`go`, `ai`, `ci`)
  survive and filler words don't pollute "missing skills."
- **Clean route design** (named interview routes registered before `/<session_id>`), JWT on
  everything, suggestion accept/dismiss UX in `AnalyzePage`, client-side voice in `InterviewChat`.

Now the fixes, in priority order.

---

# CRITICAL — fix before you call it "deployed"

## C1. Interview sessions live in memory → they vanish

`interview_engine.py` stores every session in a module-level dict:
```python
_SESSIONS: dict[str, dict[str, Any]] = {}
```
The file's own docstring admits *"Sessions live in a module-level dict and are lost on server
restart."* In production this fails in two ways:
- **Restart/redeploy** drops every in-progress interview → users hit `session_not_found`.
- **More than one worker** (Gunicorn/uvicorn `--workers 2+`, or autoscaling): the session is
  created on worker A, the next answer hits worker B, which has no such session → `session_not_found`
  intermittently and unreproducibly. This is the classic "works on localhost, breaks in prod" bug.

**Fix:** persist sessions in MySQL (you already have a DB) or Redis. Minimal MySQL approach — add a
table and store the session blob:
```sql
CREATE TABLE IF NOT EXISTS interview_sessions (
    id           VARCHAR(36) PRIMARY KEY,         -- the uuid
    user_id      INT NULL,
    role         VARCHAR(255) NULL,
    jd           LONGTEXT NULL,
    state        LONGTEXT NOT NULL,               -- JSON: history, llm_messages, current_index, use_llm
    complete     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_interview_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```
Then in `create_session` write the row; in `get_next`/`get_session`/`end_session` load `state`
from the row (JSON-decode), mutate, save back. Keep the in-memory dict only as an optional
fast-path cache. *Tell Cursor:* "Replace the `_SESSIONS` dict with read/write to the
`interview_sessions` table via `database.db.get_conn`, serializing the session dict to the `state`
JSON column. Preserve the existing function signatures."

## C2. Resume parsing is the garbage-in risk for the whole product

`resume_parser.py` uses `pypdf` and returns the structured fields empty (`"skills": []`). Two real
failure modes that silently wreck every downstream score:
- **Multi-column resumes** (very common): `pypdf` extracts text in the wrong reading order, so the
  resume text fed to the scorer is scrambled → wrong keyword overlap, wrong LLM analysis.
- **Scanned / image-only PDFs**: `extract_text()` returns `""` → the user gets a confident-looking
  score computed on nothing.

**Fix (two parts):**
1. **Better extractor.** Add `pdfplumber` (layout-aware) and prefer it; fall back to `pypdf`.
   Confirm the one dependency add with Cursor.
2. **Quality guard — never score empty/garbage text.** After extraction, check it looks like a
   resume before proceeding:
```python
def looks_extractable(text: str) -> bool:
    t = (text or "").strip()
    if len(t) < 200:                 # almost no text → likely scanned/empty
        return False
    words = t.split()
    # ratio of alphabetic words; scrambled/garbled extracts skew low
    alpha = sum(1 for w in words if any(c.isalpha() for c in w))
    return len(words) >= 50 and (alpha / max(len(words), 1)) > 0.6
```
   If it fails, return a clear error to the frontend instead of a score:
   `{"error": "low_text_extraction", "message": "We couldn't read enough text from this file. If it's a scanned PDF, upload a text-based PDF or DOCX."}`
   `AnalyzePage` should surface that as the parse-fail empty state (copy already in the homepage plan).

---

# HIGH — directly improves the quality of the core output

## H1. Turn on JSON mode for both LLM calls

Both `_chat_completion` functions rely on prompting for JSON + stripping ``` fences. When the model
adds prose or breaks the JSON, analysis silently drops to the **generic** `_FALLBACK_SUGGESTIONS`
(the user gets boilerplate, not real analysis) and the interview returns a canned line. Gemini's
OpenAI-compatible endpoint supports structured output — request it:
```python
payload = {
    "model": Config.LLM_MODEL,
    "messages": messages,
    "temperature": 0.35,
    "response_format": {"type": "json_object"},   # ← add this
}
```
This makes `_extract_json_object` / `_parse_llm_response` succeed far more often, so real analysis
shows up instead of fallback. (Keep the fence-stripping as a belt-and-suspenders fallback.)
*Also* add a single retry on parse failure before falling back — one reroll fixes most flukes.

## H2. Persist interview results so they can be reviewed

Analyses are saved to `analysis_results`, but **interviews are saved nowhere** — yet the product
sells "AI interview feedback" and has a History page. On completion (`is_complete` in
`_get_next_llm` / `_get_next_static`, and `end_session`), write the final transcript + summary to
the `interview_sessions` row (or a dedicated `interview_feedback` table). Then add a History entry
and a read view so users can revisit feedback. This closes the loop the marketing promises.

## H3. LLM-mode interview history is missing the questions

In `_get_next_llm`, each history entry stores only `answer` + `feedback`:
```python
session["history"].append({"answer": answer, "feedback": feedback})
```
The static path stores `question` too. So in LLM mode a saved/reviewed transcript has answers with
no questions attached. **Fix:** track the current question (you already get it as `question` from
the prior turn) and store it: `{"question": prev_q, "answer": answer, "feedback": feedback}`. Keep
the two code paths' history shape identical so `get_session` and any review UI are consistent.

---

# MEDIUM — robustness, cost, and accuracy

## M1. Cache identical analyses
Re-running the same resume+JD calls Gemini again (slow + costs tokens). Hash
`(resume_text, job_description, LLM_MODEL)` and cache the result (in `analysis_results`, keyed by a
new `input_hash` column, or a small `analysis_cache` table). Return the cached payload on a hit.

## M2. Rate-limit the public endpoints
A deployed free tool with no limits invites abuse and a surprise Gemini bill. Add `flask-limiter`
with per-user (JWT identity) and per-IP limits on `/analysis/run`, `/interview/start`,
`/interview/answer`. Start generous (e.g. 20 analyses/hour/user) and tune.

## M3. Normalize skill variants & multi-word terms in the baseline
`analyze_resume_against_job` matches single tokens exactly, so:
- `postgres` vs `postgresql`, `js` vs `javascript`, `node` vs `nodejs` count as different.
- Two-word skills like `machine learning`, `react native`, `power bi` never match as phrases.

**Fix:** add an alias map that canonicalizes variants before set-overlap, and detect known bigrams:
```python
_ALIASES = {
    "js": "javascript", "ts": "typescript", "postgres": "postgresql",
    "node": "nodejs", "k8s": "kubernetes", "gcp": "google-cloud", "ml": "machine-learning",
}
_BIGRAMS = {"machine learning": "machine-learning", "react native": "react-native",
            "power bi": "powerbi", "deep learning": "deep-learning"}
# normalize text: replace bigrams first, then map aliases on tokens, then overlap as today.
```
This makes the baseline score (and the "matched/missing skills" lists) noticeably more accurate,
which also gives the LLM a better hint.

## M4. Decide what to do about server-side STT
`integrations/stt_client.py` is a stub and `/interview/transcribe` returns empty text, while
`InterviewChat` actually uses the **browser** Web Speech API (`SpeechRecognition`) — which only
works in Chrome/Edge. So Safari/Firefox users get a mic button that does nothing useful. Pick one:
- **(a)** Wire real server-side transcription (Gemini accepts audio input) so voice works
  cross-browser, and use the existing `/transcribe` route; **or**
- **(b)** Keep it browser-only but **feature-detect** and hide/disable the mic with a tooltip
  ("Voice answers work in Chrome and Edge") everywhere else. Either is fine — just don't ship a
  dead button. Remove the unused stub if you choose (b).

---

# LOW — polish

- **L1. Drag-and-drop upload.** `AnalyzePage` is click-to-upload only; add a dropzone with the
  empty-state copy from the homepage plan. Validate type + the 4 MB limit with a clear message.
- **L2. Store `score_breakdown` in its own column** (or a MySQL `JSON` column) instead of packing
  it inside the `suggestions` LONGTEXT — cleaner for future analytics/sorting. Low priority; current
  pack/unpack works.
- **L3. Smarter job-title detection.** `extract_job_title` takes the first non-empty line; let the
  LLM return a `role_title` field in the analysis JSON and prefer it when present.
- **L4. Bound interview context.** `llm_messages` resends the full transcript each turn. Fine at 8
  questions; if you raise `_MAX_QUESTIONS`, summarize older turns to control token use.

---

# Build order

| # | Task | Severity | Why now |
|---|------|----------|---------|
| 1 | C1 — persist interview sessions (DB/Redis) | Critical | Breaks on restart / multi-worker |
| 2 | C2 — better extraction + empty-text guard | Critical | Garbage-in ruins every score |
| 3 | H1 — JSON mode + 1 retry on both LLM calls | High | Real analysis instead of fallback |
| 4 | H3 — store question in LLM-mode history | High | Cheap; fixes transcript integrity |
| 5 | H2 — persist + review interview results | High | Delivers a promised feature |
| 6 | M2 — rate limiting | Medium | Protects cost before traffic arrives |
| 7 | M3 — skill alias/bigram normalization | Medium | More accurate scores |
| 8 | M1 — analysis cache | Medium | Speed + token savings |
| 9 | M4 — STT decision | Medium | No dead mic button |
| 10 | L1–L4 — polish | Low | After the above |

**One correctness rule for Cursor (paste once):** *"Don't change the hybrid-scoring blend in
`analyze_resume_job` or the fallback paths — they're intentional. Add JSON mode, persistence, and a
parse-quality guard around them. Keep all existing function signatures and the route contracts in
`routes/` unchanged."*

---

## Honesty note for the marketing side
Two homepage claims should match what the engine actually does:
- Change the tech strip **PostgreSQL → MySQL** (or `React · Flask · Gemini · MySQL`).
- The "Real-time AI interview feedback" stat is fair (the chat is interactive), but only add a
  "review past interviews" claim once H2 is done — until then there's nothing to review.
