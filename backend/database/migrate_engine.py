"""Apply RCC-Engine-Plan schema changes to an existing RCC PostgreSQL database.

Adds:
- analysis_results.input_hash   (M1 - analysis cache)
- interview_sessions table      (C1 - persistent sessions, H2 - reviewable results)

Idempotent: every change is guarded by an existence check (or IF NOT EXISTS),
so it is safe to run repeatedly and is also invoked automatically on backend
startup. Run standalone with:  python database/migrate_engine.py
"""
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from config import Config

logger = logging.getLogger(__name__)


def _column_exists(cur, table, column):
    cur.execute(
        """
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema='public' AND table_name=%s AND column_name=%s
        """,
        (table, column),
    )
    return cur.fetchone()[0] > 0


def _index_exists(cur, index):
    cur.execute(
        "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public' AND indexname=%s",
        (index,),
    )
    return cur.fetchone()[0] > 0


def _table_exists(cur, table):
    cur.execute(
        """
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema='public' AND table_name=%s
        """,
        (table,),
    )
    return cur.fetchone()[0] > 0


def ensure_engine_schema(cur, verbose=False):
    """Bring an existing database up to the engine-plan schema. Idempotent."""
    def log(msg):
        if verbose:
            print(msg)

    # M1 - analysis cache key (only if the base table is present)
    if _table_exists(cur, "analysis_results"):
        if not _column_exists(cur, "analysis_results", "input_hash"):
            cur.execute(
                "ALTER TABLE analysis_results ADD COLUMN input_hash CHAR(64)"
            )
            log("Added analysis_results.input_hash")
        if not _index_exists(cur, "idx_analysis_input_hash"):
            cur.execute(
                "CREATE INDEX idx_analysis_input_hash "
                "ON analysis_results (input_hash)"
            )
            log("Created idx_analysis_input_hash")

    # C1 / H2 - persistent, reviewable interview sessions
    cur.execute(
        """
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
        )
        """
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_interview_user "
        "ON interview_sessions (user_id)"
    )
    log("Ensured interview_sessions table")

    # score column for interviews created before the scorer existed
    if _table_exists(cur, "interview_sessions") and not _column_exists(
        cur, "interview_sessions", "score"
    ):
        cur.execute("ALTER TABLE interview_sessions ADD COLUMN score INT")
        log("Added interview_sessions.score")

    # Email-code verification: expiry for the code stored in verification_token,
    # and last_login_at so the dashboard can greet a first login ("Welcome")
    # differently from a returning one ("Welcome back").
    if _table_exists(cur, "users"):
        if not _column_exists(cur, "users", "verification_expires_at"):
            cur.execute(
                "ALTER TABLE users ADD COLUMN verification_expires_at TIMESTAMP"
            )
            log("Added users.verification_expires_at")
        if not _column_exists(cur, "users", "last_login_at"):
            cur.execute("ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP")
            log("Added users.last_login_at")


def apply_on_startup():
    """Best-effort schema ensure called from create_app. Never raises - if the
    DB is unreachable at boot, the app still starts and logs a warning."""
    from database.db import get_conn

    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        ensure_engine_schema(cur)
        conn.commit()
        cur.close()
        logger.info("Engine schema verified.")
    except Exception as exc:  # noqa: BLE001 - startup must not crash on DB issues
        logger.warning("Could not verify engine schema on startup: %s", exc)
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


def main():
    conn = psycopg2.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        dbname=Config.DB_NAME,
        sslmode=Config.DB_SSLMODE,
    )
    cur = conn.cursor()
    try:
        ensure_engine_schema(cur, verbose=True)
        conn.commit()
        print("Engine migration complete.")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
