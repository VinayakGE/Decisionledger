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

---

## Risk Register (Pre-Mortem)

### Risk Rankings

| Area | Risk | Why |
|---|---|---|
| DB schema changes | 🔴 High | No migrations; SQLite schema drift possible |
| Extraction prompt/schema | 🔴 High | Core product trust depends on strict extraction behaviour |
| Upload pipeline | 🔴 High | Central synchronous path: parse → API → persist |
| API/frontend contract | 🟠 Medium-High | Manual duplicated schemas, no codegen |
| Insight engine | 🟠 Medium | Heuristic outputs misleading if not labelled carefully |
| Frontend UI-only changes | 🟠 Medium | Build catches TS issues; runtime API assumptions still matter |
| Parser additions | 🟠 Medium | Export formats vary; fixture coverage critical |
| Styling/component changes | 🟡 Low-Medium | Isolated, but run frontend build |

---

### Risk 1 — Upload → Parse → Extract → Persist pipeline
The central path. Every layer is coupled: parser output → `Conversation.full_text()` → extractor → raw entity dicts → persister → DB → API response.

**Failure mode:** Upload succeeds, zero entities extracted, orphaned reasons/evidence, incomplete UI.

**Rule:** Trace the full path before any change. Add/update tests that cover the specific format or entity behaviour being changed.

---

### Risk 2 — Frontend/Backend contract drift
No generated OpenAPI client. TypeScript interfaces in `frontend/src/lib/api.ts` manually mirror Pydantic schemas.

**Failure mode:** Backend returns valid JSON; frontend renders empty states, `undefined`, or broken sections.

**Rule:** Any backend schema/API change must include a matching frontend type + UI update in the same commit.

---

### Risk 3 — No DB migrations
Schema init uses `Base.metadata.create_all()`. Adding columns, renaming fields, or changing enums on an existing `founder_brain_audit.db` will silently fail or cause SQL errors.

**Failure mode:** Fresh DB works; existing user DB gets stale tables or missing columns.

**Rule:** Before schema changes, decide explicitly: Alembic migration OR document DB reset. Never silently change schema.

---

### Risk 4 — LLM extraction trust
The prompt forbids hallucination, requires `supporting_snippet`, enforces `Unknown` for low-confidence fields. Any prompt/schema/persister change can break the trust contract.

**Failure mode:** App extracts fabricated decisions, reasons without snippets, or broken decision→reason links.

**Rule:** For extraction changes, mock Anthropic responses in tests and verify: low-confidence handling, snippet persistence, reason/evidence linking, fenced JSON parsing, failure handling.

---

### Risk 5 — Synchronous upload timeout
Extraction runs synchronously inside the request. Large ChatGPT exports with many conversations produce multiple API calls.

**Failure mode:** Upload appears stuck, hits server/proxy timeout, fails midway after source record is already committed.

**Rule:** Do not increase synchronous work in `/upload`. For heavier analysis, plan a background job model. Handle partial failures explicitly.

---

### Risk 6 — Insight engine produces misleading results
Recurring questions use cosine similarity or Jaccard fallback. Decision reversals use similarity + timestamp diff (not true contradiction). Blind spots use first-5-words topic key.

**Failure mode:** False clusters, false reversals, weak blind spot grouping displayed as authoritative.

**Rule:** Keep UI labels cautious ("potential", "candidate"). Tests should assert stable heuristic behaviour, not semantic perfection.

---

### Risk 7 — SentenceTransformer model loading
Lazily loaded in `insight_engine/engine.py`. May require network, disk cache, RAM, or CPU on a fresh container.

**Failure mode:** `GET /insights` becomes slow or fails in fresh environments if model can't be downloaded or cached.

**Rule:** Wrap model loading defensively. Make embedding availability explicit in logs.

---

### Risk 8 — Privacy contract
README says no data leaves the machine except the Anthropic API call. Upload page says "all processing is local."

**Failure mode:** Any new networked service (analytics, remote logging, cloud storage, remote embeddings) silently violates the product promise.

**Rule:** Before adding any networked service, make it opt-in, document it explicitly, and ensure secrets/config are user-controlled.

---

### Risk 9 — Frontend API base URL
`const BASE = ""` in `api.ts`. All requests are relative to the frontend origin. Works only if nginx or Vite dev proxy routes API calls correctly.

**Failure mode:** In dev, requests may hit Vite server instead of FastAPI if proxy isn't configured. In production, built SPA breaks.

**Rule:** If making frontend/API changes, verify local dev AND Docker behaviour separately. Long-term: add `VITE_API_BASE_URL` env var.

---

### Risk 10 — Partial persistence on upload failure
`ConversationSource` is committed before extraction begins. Entities are committed per conversation. A mid-upload failure leaves source record + partial entities in DB.

**Failure mode:** User sees a successful source but incomplete data; no status field to indicate partial state.

**Rule:** When changing upload/extraction, think explicitly about transaction boundaries and status reporting.

---

### Risk 11 — Parser edge cases
ChatGPT parser sorts by `create_time` (not tree-walk). Markdown parser splits on H1/H2 + bold speaker labels. Real exports include branching, missing timestamps, tool messages, attachments, non-string content parts.

**Failure mode:** Parser drops messages, reorders branches, or mishandles rich content.

**Rule:** Preserve current simple cases. Add fixtures for every new export shape before shipping the parser.

---

### Risk 12 — UI overstates certainty
Insight pages use direct language. Extraction confidence is probabilistic. Users may over-trust low-confidence or heuristic outputs.

**Rule:** Preserve confidence badges and supporting snippets everywhere. If adding new insight types, include source links or explainability notes.

---

### Risk 13 — Frontend test coverage gap
Backend has pytest coverage. Frontend has Vitest configured but minimal tests.

**Failure mode:** Backend tests pass; frontend has TypeScript errors or runtime breakage.

**Rule:** For non-trivial frontend changes, run `npm run build` at minimum. Add Vitest component tests for new logic.

---

### Risk 14 — Heavy dependency cost
`sentence-transformers`, `scikit-learn`, `numpy` make the backend image heavy. Adding more ML or frontend deps increases build time and image size.

**Rule:** Prefer lightweight dependencies. Justify any new heavy dep explicitly.

---

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
