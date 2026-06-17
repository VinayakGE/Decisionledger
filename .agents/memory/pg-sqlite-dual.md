---
name: PostgreSQL + SQLite dual support
description: The DATABASE_URL in this Replit env points to a hosted PostgreSQL; database.py must handle both backends.
---

`DATABASE_URL` is set to `postgresql://postgres:password@helium/heliumdb?sslmode=disable` (Replit's built-in PG).

Changes made to `backend/app/database.py`:
- `_is_sqlite = settings.database_url.startswith("sqlite")`
- `connect_args={"check_same_thread": False} if _is_sqlite else {}` — SQLite-only arg must be conditional
- `_migrate_sqlite_columns()` branches: PostgreSQL uses `information_schema.columns`; SQLite uses `PRAGMA table_info`

`psycopg2-binary` must be installed for PostgreSQL support.

**Why:** The original code only targeted SQLite; Replit injects a DATABASE_URL pointing to PostgreSQL.

**How to apply:** Any future schema additions must be added to `_SCHEMA_ADDITIONS` and the dual migration path tested for both SQLite and PostgreSQL.
