# ARCC Architecture

## System Overview

```
┌────────────┐        ┌────────────────┐        ┌──────────┐
│  React SPA │──API──▶│  Flask Backend │──SQL──▶│  MySQL   │
│  port 3000 │◀──JSON─│  port 5000     │        │  port 3306│
└────────────┘        └───────┬────────┘        └──────────┘
                              │
                      ┌───────▼────────┐
                      │  Gemini LLM    │
                      │  (OpenAI-compat│
                      │   /chat/compl.)│
                      └────────────────┘
```

## Backend Layers

| Layer | Files | Responsibility |
|-------|-------|----------------|
| Routes | `routes/auth_routes.py` | Register / login (bcrypt hashing) |
| | `routes/resume_routes.py` | Upload, parse, persist resume text |
| | `routes/analysis_routes.py` | Run analysis, fetch result, history |
| | `routes/interview_routes.py` | Interview session CRUD + STT stub |
| Services | `services/analysis_service.py` | Deterministic token overlap scoring |
| | `services/interview_engine.py` | In-memory session + rule-based feedback |
| | `services/resume_parser.py` | PDF / DOCX / TXT text extraction |
| Integrations | `integrations/llm_client.py` | Hybrid overlap + Gemini analysis |
| | `integrations/stt_client.py` | STT stub (pass-through) |
| Data | `database/db.py` | Lazy MySQL connection pool |
| | `database/schema.sql` | 4-table schema (users, resumes, job_descriptions, analysis_results) |
| Config | `config.py` | Env-based settings via dotenv |

## Frontend Layers

| Layer | Files | Responsibility |
|-------|-------|----------------|
| Routing | `App.js` | 7 routes via react-router-dom |
| State | `context/WorkflowContext.js` | Resume upload, job details, analysis ID |
| API | `services/api.js` | 7 fetch helpers matching backend routes |
| Pages | `pages/*.js` | Home, Upload, Job, Results, History, Interview, Dashboard |
| Components | `components/*.js` | ResumeUploader, InterviewChat, AnalysisResults, Layout, etc. |

## Data Flow

1. **Upload** → `POST /api/resume/upload` → parse PDF/DOCX → persist `text_content` in `resumes` table → return `resume_id`
2. **Analyze** → `POST /api/analysis/run` → deterministic overlap + Gemini LLM → persist score + suggestions in `analysis_results` → return full payload
3. **Interview** → `POST /api/interview/start` → in-memory session with JD-based questions → `POST /api/interview/answer` loop → rule-based feedback → summary on completion

## Deployment

- **Docker Compose**: `database` (MySQL 8), `backend` (Python 3.11), `frontend` (Node 18)
- **Local**: `start-arcc.bat` starts Docker MySQL + Flask + React in separate terminals
- **Env**: `backend/.env` for secrets (DB password, LLM key); `.env.example` committed as template
