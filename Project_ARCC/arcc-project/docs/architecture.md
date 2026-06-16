# RCC Architecture

## System Overview

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

## Backend

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

## Frontend

| Layer | Path | Responsibility |
|-------|------|----------------|
| Routing | `App.js` | Public routes + `/app/*` dashboard (protected) |
| Auth | `context/AuthContext.js` | Session, login, signup, Google, logout |
| API | `services/api.js` | JWT-aware API client |
| Layouts | `components/PublicLayout.js` | Floating nav + footer (landing, auth) |
| | `components/DashboardLayout.js` | Sidebar + dashboard shell |
| Pages | `pages/HomePage.js` | Cinematic landing |
| | `pages/LoginPage.js`, `SignupPage.js` | Auth |
| | `pages/AnalyzePage.js` | Upload + job description + results |
| | `pages/OverviewPage.js`, `HistoryPage.js` | Stats and history |
| | `pages/InterviewPage.js` | Interview setup + `InterviewChat` |
| Motion | `components/ScrollReveal.js` | Scroll-based reveals (Framer Motion) |

## Routes

| URL | Page |
|-----|------|
| `/` | Home |
| `/login`, `/signup` | Auth |
| `/verify-email`, `/verify-pending` | Email verification |
| `/app` | Dashboard overview |
| `/app/analyze` | Resume analysis workflow |
| `/app/interview` | Interview practice |
| `/app/history` | Past analyses |

## Data Flow

1. **Sign up / login** → JWT stored client-side → `Authorization: Bearer` on API calls
2. **Analyze** → `POST /api/resume/upload` → `POST /api/analysis/run` → `GET /api/analysis/:id` → results on same page
3. **Interview** → `POST /api/interview/start` → answer loop → summary

## Deployment

- **Docker Compose**: `database` (MySQL 8 on host port 3307), `backend`, `frontend`
- **Local**: `start-arcc.bat` or manual `docker compose up database -d` + Flask + React
- **Env**: `backend/.env`, `frontend/.env.local` (local only, gitignored)
