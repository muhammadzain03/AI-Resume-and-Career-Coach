# ARCC — AI Resume and Career Coach

A full-stack web application that helps job seekers optimize their resumes, practice interviews with an AI voice coach, and track their career preparation progress.

## Features

- **Resume Upload & Parsing** — Upload PDF/DOCX resumes for automatic text extraction.
- **Job Description Analysis** — Paste a job description and get a match score, missing skills, and actionable suggestions powered by Gemini AI.
- **AI Interview Coach** — Practice mock interviews with an AI that asks dynamic questions via voice, listens to your spoken answers, and gives real-time feedback.
- **Analysis History** — Review past resume analyses from a persistent dashboard.
- **Dark / Light Theme** — Fully themed UI with automatic OS preference detection.

## Tech Stack

| Layer    | Stack                                                       |
| -------- | ----------------------------------------------------------- |
| Frontend | React 18, React Router v7, Web Speech API (TTS + STT)      |
| Backend  | Flask, Flask-CORS                                           |
| Database | MySQL                                                       |
| AI / LLM | Google Gemini (OpenAI-compatible endpoint)                  |
| DevOps   | Docker Compose                                              |

## Project Structure

```
Project_ARCC/arcc-project/
├── frontend/          React SPA (Create React App)
│   ├── src/
│   │   ├── pages/         Page components (Home, Upload, Interview, etc.)
│   │   ├── components/    Reusable UI components
│   │   ├── services/      API client
│   │   ├── context/       React context (WorkflowProvider)
│   │   └── styles/        Global CSS
│   └── public/            Static assets
├── backend/           Flask API
│   ├── routes/            Blueprints (resume, analysis, interview)
│   ├── services/          Business logic (analysis, interview engine)
│   ├── integrations/      External clients (LLM, STT)
│   └── config.py          Environment configuration
├── docs/              Architecture, API contract, design docs
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **MySQL** 8+ (or use Docker)
- A **Google Gemini API key** (optional — the app works without it but LLM features will use fallback logic)

### Quick Start with Docker

```bash
cd Project_ARCC/arcc-project
docker compose up --build
```

This starts the frontend, backend, and MySQL database.

### Manual Setup

**Backend:**

```bash
cd Project_ARCC/arcc-project/backend
cp .env.example .env        # Edit .env with your DB credentials and API key
pip install -r requirements.txt
python app.py
```

**Frontend:**

```bash
cd Project_ARCC/arcc-project/frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000` and the backend API on `http://localhost:5000/api`.

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable       | Description                              | Default                                                        |
| -------------- | ---------------------------------------- | -------------------------------------------------------------- |
| `PORT`         | Backend server port                      | `5000`                                                         |
| `DB_HOST`      | MySQL host                               | `127.0.0.1`                                                    |
| `DB_PORT`      | MySQL port                               | `3306`                                                         |
| `DB_USER`      | MySQL user                               | `root`                                                         |
| `DB_PASSWORD`  | MySQL password                           | —                                                              |
| `DB_NAME`      | Database name                            | `arcc`                                                         |
| `LLM_API_KEY`  | Gemini API key (leave empty to skip LLM) | —                                                              |
| `LLM_BASE_URL` | LLM endpoint                             | `https://generativelanguage.googleapis.com/v1beta/openai`      |
| `LLM_MODEL`    | Model name                               | `gemini-2.5-flash`                                             |

## Interview Coach — How It Works

1. Paste a job description and click **Begin Interview**.
2. The AI avatar appears on screen, speaks the first question aloud, and auto-starts listening.
3. Answer by speaking naturally (or typing). Click **Send** when done.
4. The AI gives feedback on your answer and asks a follow-up question tailored to the conversation.
5. After all questions, you receive an overall performance summary with tips.

Best experience in **Chrome** or **Edge** (Web Speech API support required for voice).

## License

This project was built as part of a university course (ENSF 400).
