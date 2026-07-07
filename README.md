# RCC - Resume and Career Coach

RCC is a full-stack web application that helps job seekers improve their resumes, measure how well those resumes match a specific job, identify missing skills, and rehearse interviews with an AI interviewer. Resume analysis, job-fit scoring, and interview practice are combined in a single application behind a secure account system.

## Live Deployment

- Application: https://resumecoach.app
- Frontend hosting: Vercel
- Backend hosting: Render
- Database hosting: Neon (managed PostgreSQL)

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [Repository Structure](#repository-structure)
6. [Local Development](#local-development)
7. [Environment Variables](#environment-variables)
8. [Database](#database)
9. [API Reference](#api-reference)
10. [Deployment](#deployment)
11. [Testing](#testing)
12. [Security Notes](#security-notes)
13. [License](#license)

## Overview

RCC reads a resume the way an applicant tracking system does, compares it against a target job description, and returns a match score with concrete, prioritized suggestions. It also provides a conversational interview practice mode that asks role-specific questions and gives feedback on each answer. Results are stored per user so that past analyses and interview sessions can be reviewed later.

The system is split into three independently deployable parts:

- A React single-page application that serves the marketing site and the authenticated dashboard.
- A Flask REST API that handles authentication, resume parsing, analysis, and interview logic.
- A PostgreSQL database that stores users, resumes, job descriptions, analysis results, and interview sessions.

## Key Features

- Resume analysis. Upload a resume in PDF or DOCX format and receive feedback on content, formatting, and ATS compatibility, with specific fixes rather than vague scores.
- Job-fit scoring. Paste any job description to see a match score, the keywords that are missing, and where to focus first.
- Interview practice. Rehearse with an AI interviewer that asks role-specific questions and returns feedback in real time. Spoken questions are supported in Chrome and Edge through the browser Web Speech API.
- Reviewable history. Past analyses and interview sessions are saved to the signed-in account.
- Authentication. Email and password sign-up, Google sign-in, and JWT access and refresh tokens. New accounts are active immediately; a welcome email is sent in the background.
- Theming. System-aware dark and light modes across the application.

## Architecture

```
Browser
   |
   |  HTTPS
   v
Vercel (React single-page application, static build)
   |
   |  HTTPS, JSON, Bearer JWT
   v
Render (Flask REST API, served by gunicorn)
   |                         |
   |  SQL over SSL           |  HTTPS
   v                         v
Neon (PostgreSQL)     Google Gemini API (OpenAI-compatible endpoint)
```

Request flow:

1. The browser loads the React application from Vercel.
2. The React application calls the Flask API using the base URL in the REACT_APP_API_BASE build variable.
3. The API validates the JWT, runs the requested operation, and reads or writes data in Neon over an SSL connection.
4. For analysis and interview features, the API calls the Google Gemini endpoint and falls back to deterministic logic when no model key is configured.

## Technology Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | React 18, React Router 7, Framer Motion, Create React App build tooling |
| Backend | Python 3.11, Flask, Flask-JWT-Extended, Flask-Mail, Flask-Limiter, Flask-CORS |
| Database | PostgreSQL 18, accessed with psycopg2 |
| AI | Google Gemini through an OpenAI-compatible API |
| Document parsing | pdfplumber, pypdf, python-docx |
| Production server | gunicorn |
| Containerization | Docker and Docker Compose for local development |

## Repository Structure

The tree below uses indentation only.

```
AI-Resume-and-Career-Coach/
  frontend/                     React single-page application
    src/
      pages/                    Home, authentication, and dashboard pages
      components/               Layout, UI, and interview components
      context/                  Authentication context
      services/                 API client (api.js)
      utils/                    Client-side helpers and validation
      styles/                   Global styles (main.css)
    public/                     Static assets and index.html
    vercel.json                 Single-page-application routing for Vercel
    Dockerfile                  Local development image
  backend/                      Flask REST API
    routes/                     auth, resume, analysis, and interview endpoints
    services/                   Business logic and email delivery
    integrations/               Gemini client
    database/
      init/01-schema.sql        Canonical database schema
      db.py                     Connection helper (psycopg2)
      migrate_engine.py         Idempotent schema updates, also run on startup
      migrate_auth.py           One-time upgrade for older databases
    app.py                      Application entry point and route registration
    config.py                   Configuration loaded from environment variables
    requirements.txt            Python dependencies
    Dockerfile                  Local development image
  docs/                         Project documentation and design notes
  docker-compose.yml            Local multi-container setup
  render.yaml                   Render deployment blueprint for the backend
  start-arcc.bat                Local one-command startup script (Windows)
```

## Local Development

### Prerequisites

- Docker Desktop
- Node.js 18 or later (only needed if you run the frontend outside Docker)
- Python 3.11 or later (only needed if you run the backend outside Docker)

### Configuration

Create the two environment files. They are not committed to version control.

- backend/.env
- frontend/.env.local

The required keys are listed in the Environment Variables section below. For local development the database values should point at the containerized PostgreSQL instance.

### Option A: One command (Windows)

```
cd AI-Resume-and-Career-Coach
start-arcc.bat
```

This starts the PostgreSQL container, the backend, and the frontend.

### Option B: Manual startup

1. Start the database container:
   ```
   docker compose up database -d
   ```
2. Start the backend:
   ```
   cd backend
   pip install -r requirements.txt
   python app.py
   ```
3. Start the frontend in a separate terminal:
   ```
   cd frontend
   npm install
   npm start
   ```
4. Open http://localhost:3000

### Option C: Full Docker Compose

```
docker compose up
```

This builds and runs the database, backend, and frontend together.

The local PostgreSQL container is based on the postgres:18-alpine image, listens on host port 5432, stores data in a named Docker volume, and loads backend/database/init/01-schema.sql automatically on first startup.

## Environment Variables

### Backend (backend/.env or the host dashboard in production)

| Variable | Description |
| -------- | ----------- |
| PORT | Port the API listens on. Defaults to 5000 locally. In production the platform provides this value. |
| DB_HOST | Database host. |
| DB_PORT | Database port. Defaults to 5432. |
| DB_USER | Database user. |
| DB_PASSWORD | Database password. |
| DB_NAME | Database name. |
| DB_SSLMODE | SSL mode for the database connection. Use prefer locally and require for managed hosts such as Neon. |
| JWT_SECRET_KEY | Secret used to sign access and refresh tokens. |
| JWT_ACCESS_TOKEN_EXPIRES | Access token lifetime in seconds. |
| JWT_REFRESH_TOKEN_EXPIRES | Refresh token lifetime in seconds. |
| GOOGLE_CLIENT_ID | Google OAuth web client ID. Must match the frontend value. |
| FRONTEND_URL | Full URL of the frontend, including the scheme. Used in welcome email links. |
| RESEND_API_KEY | Resend API key (required on Render - SMTP is blocked on the free tier). |
| RESEND_FROM | Sender address, e.g. `RCC <hello@resumecoach.app>` after domain verification in Resend. |
| MAIL_SERVER | SMTP server host (local Docker dev only). |
| MAIL_PORT | SMTP server port (local Docker dev only). |
| MAIL_USE_TLS | Whether to use TLS (local Docker dev only). |
| MAIL_USE_SSL | Whether to use SSL (local Docker dev only). |
| MAIL_USERNAME | SMTP username (local Docker dev only). |
| MAIL_PASSWORD | SMTP password or application password (local Docker dev only). |
| LLM_API_KEY | Google Gemini API key. Optional. When empty, deterministic fallbacks are used. |
| LLM_BASE_URL | Base URL for the OpenAI-compatible Gemini endpoint. |
| LLM_MODEL | Model name, for example gemini-2.5-flash. |

### Frontend (frontend/.env.local, or Vercel project settings in production)

| Variable | Description |
| -------- | ----------- |
| REACT_APP_API_BASE | Base URL of the backend API, including the /api suffix. |
| REACT_APP_GOOGLE_CLIENT_ID | Google OAuth web client ID. Must match the backend value. |

Note: variables that begin with REACT_APP_ are read at build time. After changing them in production, trigger a fresh build.

## Database

RCC uses PostgreSQL. The complete schema lives in backend/database/init/01-schema.sql and is applied automatically when the local container is first created and when the schema is loaded on a managed database.

Tables:

| Table | Purpose |
| ----- | ------- |
| users | Account records, including email, password hash, Google identity, and verification state. |
| resumes | Uploaded resume text linked to a user. |
| job_descriptions | Job descriptions submitted for scoring. |
| analysis_results | Match scores and packed analysis output, with a cache key for repeated inputs. |
| interview_sessions | Persisted interview state, transcript, summary, and score. |

On startup the backend runs an idempotent migration step that ensures newer columns and tables exist. This is safe to run repeatedly and does not affect a database that is already up to date.

## API Reference

All endpoints are served under the /api prefix. Endpoints that operate on user data require a valid Bearer access token.

Authentication

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | /api/auth/register | Create an account, sign in immediately, and send a welcome email. |
| POST | /api/auth/login | Sign in with email and password. |
| POST | /api/auth/google | Sign in with a Google credential. |
| GET | /api/auth/me | Return the current user. |
| POST | /api/auth/refresh | Issue a new access token from a refresh token. |

Resume

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | /api/resume/upload | Upload and parse a resume file. |
| GET | /api/resume/{id} | Retrieve a stored resume. |

Analysis

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | /api/analysis/run | Score a resume against a job description. |
| GET | /api/analysis/{id} | Retrieve a stored analysis. |
| GET | /api/analysis/history | List recent analyses for the current user. |

Interview

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | /api/interview/start | Start an interview session. |
| POST | /api/interview/answer | Submit an answer and receive feedback and the next question. |
| POST | /api/interview/end | End a session and return a summary and score. |
| GET | /api/interview/history | List recent interview sessions. |
| GET | /api/interview/{session_id} | Retrieve a session transcript and summary. |

Health

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | /api/health | Report API status and database reachability. |
| GET | /api/auth/health | Lightweight liveness check used by the deployment platform. |

## Deployment

RCC is deployed as three separate services. The steps below describe the current production setup.

### Database on Neon

1. Create a project on Neon, which provisions a managed PostgreSQL database.
2. Load the schema by running the contents of backend/database/init/01-schema.sql in the Neon SQL editor.
3. Copy the connection details for use as the backend DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME values. Set DB_SSLMODE to require because Neon requires SSL.

Neon on the free plan does not expire and suspends the compute when idle, resuming automatically on the next connection.

### Backend on Render

1. The repository includes render.yaml, a Render blueprint that defines the backend web service.
2. In Render, create a new Blueprint deployment from the repository. Render reads render.yaml, installs dependencies, and starts the service with gunicorn.
3. Provide the database connection values and the remaining secrets when prompted. The JWT secret is generated automatically, and DB_SSLMODE is set to require by the blueprint.
4. After the first deploy, copy the assigned service URL for use in the frontend configuration.

The Render free plan spins the service down after a period of inactivity, so the first request after an idle period can take up to about one minute while the service starts.

### Frontend on Vercel

1. Import the repository into Vercel as a new project.
2. Set the Root Directory to frontend so that Vercel builds the React application. The framework is detected as Create React App, and vercel.json provides single-page-application routing.
3. Add the build variables REACT_APP_API_BASE, set to the backend service URL followed by /api, and REACT_APP_GOOGLE_CLIENT_ID.
4. Deploy. To use a custom domain, add it in the Vercel project and point the domain records at Vercel.

### Connecting the services

1. Set the backend FRONTEND_URL to the full public frontend URL, including https, so that email links resolve correctly.
2. In the Google Cloud console, add the public frontend URL to the authorized JavaScript origins for the OAuth client so that Google sign-in works in production.

## Testing

- Frontend tests use the Create React App test runner:
  ```
  cd frontend
  npm test
  ```

## Security Notes

- Secrets are provided through environment variables and are never committed to the repository. The .env files are excluded by .gitignore.
- Passwords are stored as salted hashes.
- API access is protected with JWT access and refresh tokens.
- Rate limiting is applied to sensitive endpoints.
- Database connections to managed hosts use SSL.

## License

This project is released for personal and educational use. All rights reserved by the author.
