# Founder Brain Audit

**Convert your AI conversations into structured decision intelligence.**

Founder Brain Audit is a local-first analysis engine that parses your exported ChatGPT, Claude, Markdown, and plain text conversations and extracts structured entities — Decisions, Goals, Reasons, Evidence, Constraints, Open Questions, and Action Items — then runs an insight engine to surface recurring patterns, decision reversals, and blind spots.

> **Privacy-first.** All parsing and insight generation runs locally. Entity extraction sends conversation text to an LLM provider via your own API key — no data is sent anywhere without your explicit configuration. The default provider is Anthropic; the fallback chain (Anthropic → Gemini → Cerebras → Groq → Heuristic) tries each provider in order and stops at the first success. The Heuristic provider is fully local (no network calls). You control which providers are active by setting API keys in `.env`.

---

## Architecture

```
founder-brain-audit/
├── backend/                  # Python · FastAPI · SQLite
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, startup
│   │   ├── config.py         # Settings (pydantic-settings + .env)
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   ├── models/
│   │   │   ├── orm.py        # SQLAlchemy models
│   │   │   └── schemas.py    # Pydantic I/O schemas
│   │   ├── parsers/          # Format-specific conversation parsers
│   │   │   ├── router.py     # Auto-detect format, dispatch
│   │   │   ├── chatgpt.py
│   │   │   ├── claude_export.py
│   │   │   ├── markdown.py
│   │   │   └── plaintext.py
│   │   ├── extractor/        # LLM-based entity extraction
│   │   │   ├── engine.py     # Anthropic API calls + chunking
│   │   │   ├── persister.py  # Write entities to DB
│   │   │   └── prompts.py    # System + user prompt templates
│   │   ├── insight_engine/
│   │   │   └── engine.py     # Recurring Qs, reversals, blind spots
│   │   └── api/
│   │       ├── upload.py     # POST /upload
│   │       ├── entities.py   # GET /entities/*
│   │       └── insights.py   # GET /insights
│   ├── tests/
│   │   ├── test_parsers.py
│   │   ├── test_extractor.py
│   │   ├── test_insight_engine.py
│   │   └── test_api.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # React · TypeScript · Vite
│   ├── src/
│   │   ├── App.tsx
│   │   ├── lib/
│   │   │   ├── api.ts        # Typed API client
│   │   │   └── styles.ts     # Design tokens
│   │   ├── components/       # Shared UI components
│   │   ├── hooks/            # useData data-fetching hook
│   │   └── pages/            # One file per route
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quickstart

### Prerequisites

- Docker + Docker Compose, **or** Python 3.11+ and Node 20+
- An [Anthropic API key](https://console.anthropic.com/) (for entity extraction)

### Docker (recommended)

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

docker compose up --build
```

Open **http://localhost:3000** in your browser.

### Local development

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp ../.env.example .env   # add your ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev          # starts at http://localhost:3000
```

---

## Database

The app uses SQLite with schema auto-creation (`CREATE TABLE IF NOT EXISTS`). There are no Alembic migrations yet. If you change ORM models, the easiest reset is:

```bash
rm backend/founder_brain_audit.db   # wipe and let the app recreate on next start
```

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(required)* | Your Anthropic key for entity extraction |
| `DATABASE_URL` | `sqlite:///./founder_brain_audit.db` | SQLite path |
| `UPLOAD_DIR` | `./uploads` | Where raw files are stored |
| `MAX_UPLOAD_SIZE_MB` | `50` | Upload size limit |
| `EXTRACTION_MODEL` | `claude-haiku-4-5-20251001` | Model used for extraction (fast + cheap) |
| `SIMILARITY_THRESHOLD` | `0.80` | Cosine similarity cutoff for clustering |
| `VITE_API_BASE_URL` | *(empty — same-origin)* | **Frontend build-time only.** Set when frontend and backend are on different origins. Leave empty for Docker/nginx same-origin routing. |

---

## How it works

### 1 — Upload

Drop a file on the Upload page. Supported formats:

| Format | How to export |
|---|---|
| ChatGPT JSON | Settings → Data Controls → Export Data → `conversations.json` |
| Claude JSON | claude.ai → Settings → Export Data |
| Markdown | Any `.md` file; speaker lines like `**User:**` / `**Assistant:**` are split |
| Plain text | Any `.txt` — treated as a single document |

### 2 — Parse

The router auto-detects the format by filename extension and JSON structure sniffing, then dispatches to the appropriate parser. Each parser produces a list of `Conversation` objects with typed `Message` lists and optional timestamps.

### 3 — Extract

Each conversation is sent to the Anthropic API (model: `claude-haiku-4-5-20251001`) with a strict system prompt that:

- Forbids inventing reasons or evidence
- Requires a `supporting_snippet` (verbatim quote) for every entity
- Sets confidence to `< 0.5` and description to `"Unknown"` when certainty is low
- Returns structured JSON only

Long conversations are chunked to stay within token limits.

### 4 — Store

Extracted entities are written to SQLite via SQLAlchemy. Decisions are created first so Reasons and Evidence can link back to them by title.

### 5 — Insights

The insight engine runs over all stored entities:

| Insight | Method |
|---|---|
| Recurring Questions | Semantic clustering with `sentence-transformers/all-MiniLM-L6-v2`; falls back to word-overlap if library unavailable |
| Decision Reversals | Embed decision titles+descriptions; pairs with similarity ≥ threshold and different timestamps are flagged |
| Top Goals | Rank by `frequency` count + confidence |
| Blind Spots | Topics with ≥2 open questions and action-to-discussion ratio < 30% |

---

## API reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/upload` | Upload a conversation file |
| `GET` | `/entities/sources` | List all uploaded sources |
| `GET` | `/entities/decisions` | List decisions (filter: `source_id`, `min_confidence`) |
| `GET` | `/entities/goals` | List goals |
| `GET` | `/entities/constraints` | List constraints |
| `GET` | `/entities/open-questions` | List open questions |
| `GET` | `/entities/action-items` | List action items |
| `GET` | `/insights` | Full insight report |
| `GET` | `/health` | Health check |

Interactive docs available at **http://localhost:8000/docs** (Swagger UI).

---

## Running tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Tests use an in-memory SQLite database and mock all Anthropic API calls — no key required.

---

## Design principles

1. **Trustworthiness over completeness** — every entity has a confidence score; low-confidence fields are marked `Unknown` rather than hallucinated.
2. **Local-first** — SQLite on disk, files stored locally, no telemetry.
3. **Modular** — parsers, extractor, insight engine, and API are all independent modules with clear interfaces.
4. **Incremental** — upload more files at any time; insights regenerate over the full corpus.

---

## Milestones

| # | Milestone | Status |
|---|---|---|
| M1 | Repo structure, models, DB schema | ✅ |
| M2 | File parsers (ChatGPT, Claude, Markdown, text) | ✅ |
| M3 | LLM extraction engine + persistence | ✅ |
| M4 | FastAPI endpoints (upload, entities, insights) | ✅ |
| M5 | Insight engine (recurring Qs, reversals, blind spots) | ✅ |
| M6 | React frontend (all pages, routing, dark UI) | ✅ |
| M7 | Docker + docker-compose | ✅ |
| M8 | Unit tests (parsers, extractor, API, insights) | ✅ |
| M9 | Unresolved decisions detection | 🔜 next |
| M10 | Goal deduplication + status inference | 🔜 next |
| M11 | Timeline view | 🔜 next |

---

## License

MIT