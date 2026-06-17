"""Cerebras Cloud provider (free tier: 1M tokens/day, no training on data).

Uses the OpenAI-compatible REST API — no gRPC, no SSL cert issues.
Get a free key: https://cloud.cerebras.ai
Set CEREBRAS_API_KEY in .env
"""

import logging
from typing import Any, Dict

from app.config import settings
from app.extractor.prompts import SYSTEM_PROMPT, USER_TEMPLATE
from app.extractor.providers.base import ExtractionProvider
from app.parsers.base import Conversation

logger = logging.getLogger(__name__)

MAX_CHARS = 800_000
MODEL = "llama-3.3-70b"
BASE_URL = "https://api.cerebras.ai/v1"


class CerebrasProvider(ExtractionProvider):
    name = "cerebras"

    def extract(self, conv: Conversation) -> Dict[str, Any]:
        if not settings.cerebras_api_key:
            raise RuntimeError("No Cerebras API key configured.")

        try:
            import httpx
        except ImportError:
            raise RuntimeError("httpx not installed.")

        text = self._truncate(conv.full_text(), MAX_CHARS)
        ts = conv.created_at.isoformat() if conv.created_at else "unknown"
        user_msg = USER_TEMPLATE.format(title=conv.title, timestamp=ts, text=text)

        headers = {
            "Authorization": f"Bearer {settings.cerebras_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            "max_tokens": 4096,
            "temperature": 0.1,
        }

        try:
            with httpx.Client(timeout=120) as client:
                resp = client.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload)
            if resp.status_code == 429:
                raise RuntimeError(f"Cerebras rate limit: {resp.text}")
            if resp.status_code in (401, 403):
                raise RuntimeError(f"Cerebras auth failed: {resp.text}")
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return {"raw": content, "provider": self.name}
        except RuntimeError:
            raise
        except Exception as e:
            raise RuntimeError(f"Cerebras call failed: {e}") from e
