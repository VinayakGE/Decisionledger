---
name: Settings API pattern
description: How runtime API key updates work; how the settings page connects to the backend.
---

`backend/app/api/settings.py` exposes:
- `GET /settings` → returns provider status (configured: bool) for anthropic, gemini, cerebras, groq + heuristic_always_available
- `POST /settings` → accepts optional key fields, calls `setattr(settings, attr, val)` + `os.environ[ENV_KEY] = val`

Runtime updates work immediately because all providers read from `settings.<key>` lazily inside their `extract()` method — not at class instantiation.

Gemini returns HTTP 400 (not 401/403) for invalid API keys. The provider now treats 400, 401, 403 all as auth/config errors so the fallback chain moves to the next provider quickly.

Frontend settings page (`SettingsPage.tsx`) shows provider status and allows entering keys. Keys persist until server restart. For permanent storage, users should add them as Replit Secrets with names: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `GROQ_API_KEY`.

**Why:** Users need a way to configure keys without SSH access or Replit secrets panel.
