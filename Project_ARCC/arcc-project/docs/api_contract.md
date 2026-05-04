# ARCC API Contract

Base URL: `http://localhost:5000/api`

---

## Auth

### `POST /auth/register`
**Request:** `{ "email": string, "password": string }`
**201:** `{ "user_id": int, "email": string }`
**400:** missing fields | **409:** email exists | **500:** DB error

### `POST /auth/login`
**Request:** `{ "email": string, "password": string }`
**200:** `{ "user_id": int, "email": string }`
**401:** invalid credentials | **500:** DB error

---

## Resume

### `POST /resume/upload`
**Request:** multipart/form-data — field `resume` (PDF/DOCX/TXT, max 4 MB), optional `user_id`
**201:** `{ "message": string, "resume_id": int, "filename": string, "preview": string }`
**400:** no file / bad type | **413:** over 4 MB | **422:** no text extracted | **500:** DB error

### `GET /resume/<resume_id>`
**200:** `{ "resume_id": int, "user_id": int|null, "filename": string, "preview": string, "created_at": string }`
**404:** not found | **500:** DB error

---

## Analysis

### `POST /analysis/run`
**Request:** `{ "resume_id": int, "job_description": string, "user_id": int|null }`
**201:** `{ "analysis_id": int, "resume_id": int, "job_id": int, "match_score": float, "matched_skills": string[], "missing_skills": string[], "suggestions": string[] }`
**400:** missing fields | **404:** resume not found | **422:** no text | **500:** analysis or DB error

### `GET /analysis/<analysis_id>`
**200:** `{ "analysis_id": int, "resume_id": int, "job_id": int, "match_score": float, "job_description": string, "matched_skills": string[], "missing_skills": string[], "suggestions": string[] }`
**404:** not found | **500:** DB error

### `GET /analysis/history?limit=20`
**200:** `{ "count": int, "history": [{ "analysis_id", "resume_id", "job_id", "match_score", "filename", "job_title", "created_at" }] }`
**500:** DB error

---

## Interview

### `POST /interview/start`
**Request:** `{ "job_description": string, "role": string|"" }`
**201:** `{ "session_id": string, "total_questions": int, "first_question": string }`
**400:** missing JD

### `POST /interview/answer`
**Request:** `{ "session_id": string, "answer": string }`
**200:** `{ "question_number": int, "total_questions": int, "feedback": string, "complete": bool, "next_question": string|absent, "summary": string|absent }`
**400:** missing fields | **404:** session not found | **410:** session complete

### `GET /interview/<session_id>`
**200:** `{ "session_id": string, "role": string, "question_number": int, "total_questions": int, "complete": bool, "current_question": string|null, "history": array }`
**404:** session not found

### `POST /interview/end`
**Request:** `{ "session_id": string }`
**200:** `{ "session_id": string, "questions_answered": int, "summary": string }`
**400:** missing ID | **404:** not found

### `POST /interview/transcribe`
**Request:** multipart/form-data — field `audio`
**200:** `{ "text": string, "provider": "stub", "confidence": null }`
**400:** no audio file
