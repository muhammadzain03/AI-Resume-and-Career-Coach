# RCC - Resume and Career Coach

A full-stack web application that helps job seekers optimize their resumes, practice interviews with an AI voice coach, and track their career preparation progress.

## Features

- **Resume analysis** - Upload a resume and job description on one page; get match score, skill gaps, and suggestions.
- **AI interview coach** - Mock interviews with spoken questions and feedback (Chrome/Edge recommended).
- **Dashboard** - Overview stats, history, and interview practice behind login.
- **Auth** - Email/password with verification, Google sign-in, JWT sessions.
- **Dark / light theme** - System-aware theming across the app.

## Tech Stack

| Layer    | Stack |
| -------- | ----- |
| Frontend | React 18, React Router v7, Framer Motion |
| Backend  | Flask, Flask-JWT-Extended, Flask-Mail, Google OAuth |
| Database | MySQL 8 (Docker on port 3307) |
| AI       | Google Gemini (OpenAI-compatible API) |

## Project Structure

```
Project_ARCC/arcc-project/
├── frontend/
│   ├── src/
│   │   ├── pages/          Home, auth, dashboard pages
│   │   ├── components/     Layouts, UI, InterviewChat
│   │   ├── context/        AuthContext
│   │   ├── services/       api.js (JWT client)
│   │   ├── utils/          validation.js
│   │   └── styles/         main.css
│   └── public/
├── backend/
│   ├── routes/             auth, resume, analysis, interview
│   ├── services/           business logic + email
│   ├── database/
│   │   ├── init/01-schema.sql   ← single canonical schema
│   │   ├── migrate_auth.py      ← upgrade old DBs only
│   │   └── db.py
│   └── config.py
├── docs/                   architecture, API contract
├── docker-compose.yml
└── start-arcc.bat
```

## Quick Start

1. Ensure `backend/.env` and `frontend/.env.local` exist (not committed to git).
2. Start Docker Desktop, then:
   ```bash
   cd Project_ARCC/arcc-project
   start-arcc.bat
   ```
   Or: `docker compose up database -d`, then `python backend/app.py` and `npm start` in `frontend/`.
3. Open http://localhost:3000

## Environment (backend)

| Variable | Description |
| -------- | ----------- |
| `JWT_SECRET_KEY` | Signs login tokens |
| `GOOGLE_CLIENT_ID` | Google sign-in (match frontend `REACT_APP_GOOGLE_CLIENT_ID`) |
| `MAIL_*` | Gmail SMTP for verification emails |
| `DB_*` | MySQL (Docker: port **3307**, password **root**) |
| `LLM_API_KEY` | Optional Gemini key |

See `backend/database/README.md` for database setup details.

## License

Built as part of a university course (ENSF 400).
