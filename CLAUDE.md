# Decisionledger — Claude Code Instructions

## Change Protocol (mandatory before any code change)

### 1. Clarify scope
- Backend only / Frontend only / Full-stack?
- Does it affect the extraction schema, data shape, or persisted DB tables?

### 2. Identify contract points
- If API response shape changes → update Pydantic schema AND frontend TypeScript interface together, in the same commit.

### 3. Protect the upload path
- If touching `/upload` or anything in `app/api/upload.py` → add or update tests in `tests/test_api.py` covering the affected behaviour.

### 4. Protect parser behaviour
- If touching any parser (`app/parsers/`) → add or update fixture-based tests in `tests/test_parsers.py`.

### 5. Be cautious with DB schema
- If ORM models in `app/models/orm.py` change → explicitly decide: add Alembic migration OR document reset behaviour. Never silently change schema.

### 6. Run the right checks before pushing

| Layer changed | Command | Working directory |
|---|---|---|
| Backend (any) | `pytest tests/ -v` | `backend/` |
| Frontend (any) | `npm run build` | `frontend/` |
| Docker / runtime wiring | `docker compose up --build` | repo root |

All checks must pass before committing.

## Project layout

```
backend/   FastAPI + SQLAlchemy + SQLite
frontend/  React + TypeScript + Vite
```

## Provider chain
Anthropic → Gemini → Cerebras → Groq → Heuristic (zero-dependency fallback)

## Branch convention
Active development: `eval/extraction-evaluation` (PR #2 → main)

## API keys
Stored in `backend/.env` — never committed. See `.env.example` for required keys.
