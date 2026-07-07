"""Apply auth-related schema changes to an existing RCC PostgreSQL database."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from config import Config

COLUMNS = [
    ("name", "VARCHAR(100)"),
    ("google_id", "VARCHAR(255)"),
    ("email_verified", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("verification_token", "VARCHAR(255)"),
    ("verification_expires_at", "TIMESTAMP"),
    ("last_login_at", "TIMESTAMP"),
    ("avatar_url", "TEXT"),
]


def column_exists(cur, table, column):
    cur.execute(
        """
        SELECT COUNT(*) AS c
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name=%s AND column_name=%s
        """,
        (table, column),
    )
    return cur.fetchone()[0] > 0


def index_exists(cur, index):
    cur.execute(
        "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public' AND indexname=%s",
        (index,),
    )
    return cur.fetchone()[0] > 0


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
        cur.execute(
            """
            SELECT is_nullable FROM information_schema.columns
            WHERE table_schema='public' AND table_name='users'
                AND column_name='password_hash'
            """
        )
        row = cur.fetchone()
        if row and row[0] == "NO":
            cur.execute("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL")
            print("Made users.password_hash nullable")

        for name, definition in COLUMNS:
            if not column_exists(cur, "users", name):
                cur.execute(f"ALTER TABLE users ADD COLUMN {name} {definition}")
                print(f"Added users.{name}")

        if not index_exists(cur, "idx_users_google_id"):
            cur.execute(
                "CREATE UNIQUE INDEX idx_users_google_id ON users (google_id)"
            )
            print("Created idx_users_google_id")

        conn.commit()
        print("Migration complete.")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
