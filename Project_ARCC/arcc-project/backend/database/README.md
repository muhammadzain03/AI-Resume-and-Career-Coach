# Database

## Files

| File | Purpose |
|------|---------|
| `init/01-schema.sql` | **Canonical schema** - runs automatically on first Docker MySQL boot |
| `migrate_auth.py` | One-time upgrade for databases created before auth columns existed |
| `db.py` | MySQL connection pool used by the Flask app |

## Fresh install (Docker)

```bash
docker compose up database -d
```

Tables are created from `init/01-schema.sql` via `docker-entrypoint-initdb.d`.

## Existing database (manual upgrade)

```bash
cd backend
python database/migrate_auth.py
```

## Do not duplicate schema

Keep a single copy in `init/01-schema.sql`. If you change the schema, edit that file only, then recreate the DB volume if needed:

```bash
docker compose down -v
docker compose up database -d
```
