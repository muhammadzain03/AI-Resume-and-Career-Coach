# RCC API Contract

Base URL: `http://localhost:5000/api`

Protected routes require header: `Authorization: Bearer <access_token>`

---

## Auth

### `POST /auth/register`
**Request:** `{ "name": string, "email": string, "password": string }` (password min 8 chars)  
**201:** `{ "user", "access_token", "refresh_token", "message" }`  
**409:** email already registered

### `POST /auth/login`
**Request:** `{ "email": string, "password": string }`  
**200:** `{ "user", "access_token", "refresh_token" }`  
**401:** invalid credentials | **403:** email not verified

### `POST /auth/google`
**Request:** `{ "credential": string }` (Google ID token from frontend)  
**200:** `{ "user", "access_token", "refresh_token" }`

### `GET /auth/verify/:token`
**200:** `{ "message", "user" }` - marks email verified

### `GET /auth/me` (JWT)
**200:** `{ "user": { id, email, name, email_verified, avatar_url } }`

### `POST /auth/refresh` (refresh JWT)
**200:** `{ "access_token" }`

---

## Resume (JWT required)

### `POST /resume/upload`
**Request:** multipart `resume` (PDF/DOCX, max 4 MB)  
**201:** `{ "resume_id", "filename", "preview", "message" }`

### `GET /resume/<resume_id>`
**200:** `{ "resume_id", "user_id", "filename", "preview", "created_at" }`

---

## Analysis (JWT required)

### `POST /analysis/run`
**Request:** `{ "resume_id": int, "job_description": string }`  
**201:** `{ "analysis_id", "match_score", "matched_skills", "missing_skills", "suggestions", ... }`

### `GET /analysis/<analysis_id>`
**200:** full analysis payload

### `GET /analysis/history?limit=20`
**200:** `{ "count", "history": [...] }` - current user only

---

## Interview (JWT required)

### `POST /interview/start`
**Request:** `{ "job_description": string, "role": string }`  
**201:** `{ "session_id", "total_questions", "first_question" }`

### `POST /interview/answer`
**Request:** `{ "session_id", "answer" }`  
**200:** feedback, optional `next_question`, `complete`, `summary`

### `POST /interview/end`
**Request:** `{ "session_id" }`

### `GET /interview/<session_id>`
**200:** session state

### `POST /interview/transcribe`
**Request:** multipart `audio` (stub returns empty text)
