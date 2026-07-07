CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(100),
    google_id VARCHAR(255) UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_expires_at TIMESTAMP,
    last_login_at TIMESTAMP,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resumes (
    id SERIAL PRIMARY KEY,
    user_id INT,
    filename VARCHAR(255) NOT NULL,
    text_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resumes_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS job_descriptions (
    id SERIAL PRIMARY KEY,
    user_id INT,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_desc_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    resume_id INT NOT NULL,
    job_id INT NOT NULL,
    match_score REAL DEFAULT 0,
    suggestions TEXT,
    input_hash CHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_analysis_resume
        FOREIGN KEY (resume_id) REFERENCES resumes(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_analysis_job
        FOREIGN KEY (job_id) REFERENCES job_descriptions(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analysis_input_hash
    ON analysis_results (input_hash);

-- Interview sessions are persisted so they survive restarts and work across
-- multiple workers. `state` holds the full session blob (history, llm_messages,
-- current_index, use_llm) as JSON; `summary` is filled in on completion so
-- finished interviews can be reviewed from the History page.
CREATE TABLE IF NOT EXISTS interview_sessions (
    id           VARCHAR(36) PRIMARY KEY,
    user_id      INT,
    role         VARCHAR(255),
    jd           TEXT,
    state        TEXT NOT NULL,
    summary      TEXT,
    score        INT,
    complete     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_interview_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_interview_user
    ON interview_sessions (user_id);
