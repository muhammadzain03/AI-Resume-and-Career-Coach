# RCC Project Documentation

Technical reference for the Resume & Career Coach app (`Project_ARCC/arcc-project`).

Planning docs (do not replace this file):

- `RCC-Rezzy-Plan.md` - landing page / Rezzy-style redesign plan
- `RCC-Engine-Plan.md` - analysis engine and backend improvements plan

---

## Architecture

### System overview

```
┌------┐        ┌--------┐        ┌-----┐
│  React SPA │-API-▶│  Flask Backend │-SQL-▶│  MySQL   │
│  port 3000 │◀-JSON-│  port 5000     │        │  port 3307│
└------┘        └----┬----┘        └-----┘
                              │
                      ┌----▼----┐
                      │  Gemini LLM    │
                      │  (OpenAI-compat)│
                      └--------┘
```

### Backend

| Layer | Path | Responsibility |
|-------|------|----------------|
| App | `app.py` | Flask factory, JWT, CORS, mail |
| Routes | `routes/auth_routes.py` | Register, login, Google OAuth, email verify, JWT refresh |
| | `routes/resume_routes.py` | Upload and fetch resumes (JWT required) |
| | `routes/analysis_routes.py` | Run analysis, results, per-user history |
| | `routes/interview_routes.py` | Mock interview sessions |
| Services | `services/analysis_service.py` | Token overlap + LLM analysis |
| | `services/interview_engine.py` | In-memory interview sessions |
| | `services/resume_parser.py` | PDF / DOCX / TXT extraction |
| | `services/email_service.py` | Verification and welcome email |
| Integrations | `integrations/llm_client.py` | Gemini via OpenAI-compatible API |
| | `integrations/stt_client.py` | STT stub |
| Data | `database/db.py` | MySQL connection pool |
| | `database/init/01-schema.sql` | Canonical DB schema (Docker init) |
| | `database/migrate_auth.py` | Upgrade legacy databases |
| Auth | `auth_utils.py` | JWT user id helper, DB error mapping |

### Frontend

| Layer | Path | Responsibility |
|-------|------|----------------|
| Routing | `App.js` | Public routes + protected `/app/*` dashboard |
| Auth | `context/AuthContext.js` | Session, login, signup, Google, logout |
| API | `services/api.js` | JWT-aware API client |
| Layouts | `components/PublicLayout.js` | Site nav, theme toggle, footer (landing, auth) |
| | `components/DashboardLayout.js` | Sidebar + dashboard shell |
| Pages | `pages/HomePage.js` | Landing (hero, features, product preview) |
| | `pages/AuthPage.js` | Login and signup |
| | `pages/AnalyzePage.js` | Upload + job description + results (single flow) |
| | `pages/OverviewPage.js`, `HistoryPage.js` | Stats and history |
| | `pages/InterviewPage.js` | Interview setup + `InterviewChat` |
| Motion | `components/ScrollReveal.js`, `ProductFrame.js` | Scroll reveals and hero device preview |

### Routes

| URL | Page |
|-----|------|
| `/` | Home |
| `/login`, `/signup` | Auth (`AuthPage`) |
| `/verify-email`, `/verify-pending` | Email verification |
| `/app` | Dashboard overview |
| `/app/analyze` | Resume analysis workflow |
| `/app/interview` | Interview practice |
| `/app/history` | Past analyses |

Legacy paths (`/upload`, `/job`, `/dashboard`, `/interview`) redirect to the routes above.

### Data flow

1. **Sign up / login** - JWT stored client-side - `Authorization: Bearer` on API calls
2. **Analyze** - `POST /api/resume/upload` - `POST /api/analysis/run` - `GET /api/analysis/:id` - results on `AnalyzePage`
3. **Interview** - `POST /api/interview/start` - answer loop - summary

### Deployment

- **Docker Compose**: `database` (MySQL 8 on host port 3307), `backend`, `frontend`
- **Local**: `start-arcc.bat` or `docker compose up database -d` + Flask + React (batch files are local-only, gitignored)
- **Env**: `backend/.env`, `frontend/.env.local` (local only, gitignored)

---

## API contract

Base URL: `http://localhost:5000/api`

Protected routes require header: `Authorization: Bearer <access_token>`

### Auth

#### `POST /auth/register`
**Request:** `{ "name": string, "email": string, "password": string }` (password min 8 chars)  
**201:** `{ "user", "access_token", "refresh_token", "message" }`  
**409:** email already registered

#### `POST /auth/login`
**Request:** `{ "email": string, "password": string }`  
**200:** `{ "user", "access_token", "refresh_token" }`  
**401:** invalid credentials | **403:** email not verified

#### `POST /auth/google`
**Request:** `{ "credential": string }` (Google ID token from frontend)  
**200:** `{ "user", "access_token", "refresh_token" }`

#### `GET /auth/verify/:token`
**200:** `{ "message", "user" }` - marks email verified

#### `GET /auth/me` (JWT)
**200:** `{ "user": { id, email, name, email_verified, avatar_url } }`

#### `POST /auth/refresh` (refresh JWT)
**200:** `{ "access_token" }`

### Resume (JWT required)

#### `POST /resume/upload`
**Request:** multipart `resume` (PDF/DOCX, max 4 MB)  
**201:** `{ "resume_id", "filename", "preview", "message" }`

#### `GET /resume/<resume_id>`
**200:** `{ "resume_id", "user_id", "filename", "preview", "created_at" }`

### Analysis (JWT required)

#### `POST /analysis/run`
**Request:** `{ "resume_id": int, "job_description": string }`  
**201:** `{ "analysis_id", "match_score", "matched_skills", "missing_skills", "suggestions", ... }`

#### `GET /analysis/<analysis_id>`
**200:** full analysis payload

#### `GET /analysis/history?limit=20`
**200:** `{ "count", "history": [...] }` - current user only

### Interview (JWT required)

#### `POST /interview/start`
**Request:** `{ "job_description": string, "role": string }`  
**201:** `{ "session_id", "total_questions", "first_question" }`

#### `POST /interview/answer`
**Request:** `{ "session_id", "answer" }`  
**200:** feedback, optional `next_question`, `complete`, `summary`

#### `POST /interview/end`
**Request:** `{ "session_id" }`

#### `GET /interview/<session_id>`
**200:** session state

#### `POST /interview/transcribe`
**Request:** multipart `audio` (stub returns empty text)

---

## Database

### Files

| File | Purpose |
|------|---------|
| `backend/database/init/01-schema.sql` | **Canonical schema** - runs on first Docker MySQL boot |
| `backend/database/migrate_auth.py` | One-time upgrade for databases created before auth columns |
| `backend/database/db.py` | MySQL connection pool used by the Flask app |

### Fresh install (Docker)

```bash
docker compose up database -d
```

Tables are created from `init/01-schema.sql` via `docker-entrypoint-initdb.d`.

### Existing database (manual upgrade)

```bash
cd backend
python database/migrate_auth.py
```

### Schema changes

Keep a single copy in `init/01-schema.sql`. After editing, recreate the DB volume if needed:

```bash
docker compose down -v
docker compose up database -d
```

---

## Accessibility

Implemented for core workflows (navigation, analyze, auth):

- Semantic landmarks (`header`, `aside`, `main`, `footer`)
- Keyboard-accessible controls and visible `:focus-visible` styles
- Labeled form fields and `aria-label` on theme toggle
- Live regions for upload/analysis status where needed
- `prefers-reduced-motion` support in CSS and motion components

Not yet attached: formal Lighthouse/axe audit reports.
