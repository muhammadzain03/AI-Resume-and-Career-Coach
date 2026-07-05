"""PostgreSQL connection helper.

`get_conn()` returns a fresh psycopg2 connection. A small connection subclass
lets existing call sites keep using ``conn.cursor(dictionary=True)`` (the MySQL
style): when ``dictionary=True`` is passed we transparently use psycopg2's
``RealDictCursor`` so rows behave like dicts. A plain ``conn.cursor()`` still
returns standard tuple rows.
"""
import psycopg2
from psycopg2.extensions import connection as _PgConnection
from psycopg2.extras import RealDictCursor

from config import Config


class _RCCConnection(_PgConnection):
    def cursor(self, *args, dictionary=False, **kwargs):
        if dictionary:
            kwargs.setdefault("cursor_factory", RealDictCursor)
        return super().cursor(*args, **kwargs)


def get_conn():
    return psycopg2.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        dbname=Config.DB_NAME,
        connection_factory=_RCCConnection,
    )
