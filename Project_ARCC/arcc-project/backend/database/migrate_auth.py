"""Apply auth-related schema changes to an existing RCC MySQL database."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import mysql.connector
from config import Config

COLUMNS = [
    ("name", "VARCHAR(100) NULL"),
    ("google_id", "VARCHAR(255) NULL"),
    ("email_verified", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("verification_token", "VARCHAR(255) NULL"),
    ("avatar_url", "TEXT NULL"),
]


def column_exists(cur, table, column):
    cur.execute(
        """
        SELECT COUNT(*) AS c
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s AND COLUMN_NAME=%s
        """,
        (Config.DB_NAME, table, column),
    )
    return cur.fetchone()[0] > 0


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
        cur.execute(
            """
            SELECT IS_NULLABLE FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA=%s AND TABLE_NAME='users' AND COLUMN_NAME='password_hash'
            """,
            (Config.DB_NAME,),
        )
        row = cur.fetchone()
        if row and row[0] == "NO":
            cur.execute("ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL")
            print("Made users.password_hash nullable")

        for name, definition in COLUMNS:
            if not column_exists(cur, "users", name):
                cur.execute(f"ALTER TABLE users ADD COLUMN {name} {definition}")
                print(f"Added users.{name}")

        cur.execute(
            """
            SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA=%s AND TABLE_NAME='users' AND INDEX_NAME='idx_users_google_id'
            """,
            (Config.DB_NAME,),
        )
        if cur.fetchone()[0] == 0:
            cur.execute(
                "CREATE UNIQUE INDEX idx_users_google_id ON users (google_id)"
            )
            print("Created idx_users_google_id")

        cur.execute(
            "UPDATE users SET email_verified=TRUE WHERE password_hash IS NOT NULL"
        )
        conn.commit()
        print("Migration complete.")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
