"""Apply RCC-Engine-Plan schema changes to an existing RCC MySQL database.

Adds:
- analysis_results.input_hash   (M1 - analysis cache)
- interview_sessions table      (C1 - persistent sessions, H2 - reviewable results)

Idempotent: every change is guarded by an existence check, so it is safe to
run repeatedly and is also invoked automatically on backend startup.
Run standalone with:  python database/migrate_engine.py
"""
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import mysql.connector
from config import Config

logger = logging.getLogger(__name__)


def _column_exists(cur, table, column):
    cur.execute(
        """
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s AND COLUMN_NAME=%s
        """,
        (Config.DB_NAME, table, column),
    )
    return cur.fetchone()[0] > 0


def _index_exists(cur, table, index):
    cur.execute(
        """
        SELECT COUNT(*) FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s AND INDEX_NAME=%s
        """,
        (Config.DB_NAME, table, index),
    )
    return cur.fetchone()[0] > 0


def _table_exists(cur, table):
    cur.execute(
        """
        SELECT COUNT(*) FROM information_schema.TABLES
        WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s
        """,
        (Config.DB_NAME, table),
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
                "ALTER TABLE analysis_results ADD COLUMN input_hash CHAR(64) NULL"
            )
            log("Added analysis_results.input_hash")
        if not _index_exists(cur, "analysis_results", "idx_analysis_input_hash"):
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
            user_id      INT NULL,
            role         VARCHAR(255) NULL,
            jd           LONGTEXT NULL,
            state        LONGTEXT NOT NULL,
            summary      LONGTEXT NULL,
            complete     BOOLEAN NOT NULL DEFAULT FALSE,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_interview_user
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE SET NULL,
            INDEX idx_interview_user (user_id)
        )
        """
    )
    log("Ensured interview_sessions table")


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
    conn = mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
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
