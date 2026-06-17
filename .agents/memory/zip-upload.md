---
name: ZIP upload pipeline
description: How ZIP exports (ChatGPT/Claude data exports) are handled in the parser router.
---

Added `_parse_zip(content: bytes)` in `backend/app/parsers/router.py`.

Logic:
1. Open zip with `zipfile.ZipFile`
2. Look for `conversations.json` first (preferred), then `chat.json`, `export.json`, then any `.json`
3. Sniff the JSON format (chatgpt = has `mapping`, claude = has `chat_messages`)
4. Delegate to existing `chatgpt.parse()` or `claude_export.parse()`

Claude data exports contain `conversations.json` with keys `uuid, name, chat_messages, sender`.
ChatGPT data exports contain `conversations.json` with keys `title, mapping`.

`ValueError` from `_parse_zip` is caught in `upload.py` and surfaced as HTTP 422.

Frontend: `ACCEPTED = ".zip,.json,.md,.txt"` in `UploadPage.tsx`.

**Why:** Users upload the full export zip without extracting it first.
