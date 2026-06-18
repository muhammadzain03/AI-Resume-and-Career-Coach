CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    name VARCHAR(100) NULL,
    google_id VARCHAR(255) NULL UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(255) NULL,
    avatar_url TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    filename VARCHAR(255) NOT NULL,
    text_content LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resumes_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS job_descriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    description LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_desc_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS analysis_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT NOT NULL,
    job_id INT NOT NULL,
    match_score FLOAT DEFAULT 0,
    suggestions LONGTEXT,
    input_hash CHAR(64) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_analysis_resume
        FOREIGN KEY (resume_id) REFERENCES resumes(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_analysis_job
        FOREIGN KEY (job_id) REFERENCES job_descriptions(id)
        ON DELETE CASCADE,
    INDEX idx_analysis_input_hash (input_hash)
);

-- Interview sessions are persisted so they survive restarts and work across
-- multiple workers. `state` holds the full session blob (history, llm_messages,
-- current_index, use_llm) as JSON; `summary` is filled in on completion so
-- finished interviews can be reviewed from the History page.
CREATE TABLE IF NOT EXISTS interview_sessions (
    id           VARCHAR(36) PRIMARY KEY,
    user_id      INT NULL,
    role         VARCHAR(255) NULL,
    jd           LONGTEXT NULL,
    state        LONGTEXT NOT NULL,
    summary      LONGTEXT NULL,
    score        INT NULL,
    complete     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_interview_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    INDEX idx_interview_user (user_id)
);
