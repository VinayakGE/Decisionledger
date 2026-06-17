"""Groq Cloud provider (free tier: ~500K tokens/day, no training on data).

Uses the OpenAI-compatible REST API — fast inference, no gRPC.
Get a free key: https://console.groq.com
Set GROQ_API_KEY in .env
"""
import logging
from typing import Dict, Any
from app.parsers.base import Conversation
from app.extractor.providers.base import ExtractionProvider
from app.extractor.prompts import SYSTEM_PROMPT, USER_TEMPLATE
from app.config import settings

logger = logging.getLogger(__name__)

MAX_CHARS = 800_000
MODEL = "llama-3.3-70b-versatile"
BASE_URL = "https://api.groq.com/openai/v1"


class GroqProvider(ExtractionProvider):
    name = "groq"

    def extract(self, conv: Conversation) -> Dict[str, Any]:
        if not settings.groq_api_key:
            raise RuntimeError("No Groq API key configured.")

        try:
            import httpx
        except ImportError:
            raise RuntimeError("httpx not installed.")

        text = self._truncate(conv.full_text(), MAX_CHARS)
        ts = conv.created_at.isoformat() if conv.created_at else "unknown"
        user_msg = USER_TEMPLATE.format(title=conv.title, timestamp=ts, text=text)

        headers = {
            "Authorization": f"Bearer {settings.groq_api_key}",
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
                raise RuntimeError(f"Groq rate limit: {resp.text}")
            if resp.status_code in (401, 403):
                raise RuntimeError(f"Groq auth failed: {resp.text}")
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return {"raw": content, "provider": self.name}
        except RuntimeError:
            raise
        except Exception as e:
            raise RuntimeError(f"Groq call failed: {e}") from e
