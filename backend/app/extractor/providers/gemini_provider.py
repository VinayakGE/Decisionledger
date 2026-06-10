"""Google Gemini Flash provider (free-tier fallback).

Uses direct REST API — no SDK, no gRPC, no version conflicts.

Free tier: 15 RPM, 1M tokens/day, 1M token context window.
Get a free key: https://aistudio.google.com/app/apikey
Set GEMINI_API_KEY in .env
"""
import logging
from typing import Dict, Any
from app.parsers.base import Conversation
from app.extractor.providers.base import ExtractionProvider
from app.extractor.prompts import SYSTEM_PROMPT, USER_TEMPLATE
from app.config import settings

logger = logging.getLogger(__name__)

MAX_CHARS = 800_000
MODEL = "gemini-2.0-flash"
BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


class GeminiProvider(ExtractionProvider):
    name = "gemini"

    def extract(self, conv: Conversation) -> Dict[str, Any]:
        if not settings.gemini_api_key:
            raise RuntimeError("No Gemini API key configured.")

        try:
            import httpx
        except ImportError:
            raise RuntimeError("httpx not installed.")

        text = self._truncate(conv.full_text(), MAX_CHARS)
        ts = conv.created_at.isoformat() if conv.created_at else "unknown"
        user_msg = USER_TEMPLATE.format(title=conv.title, timestamp=ts, text=text)

        headers = {"x-goog-api-key": settings.gemini_api_key, "Content-Type": "application/json"}
        payload = {
            "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"parts": [{"text": user_msg}]}],
            "generationConfig": {"maxOutputTokens": 4096, "temperature": 0.1},
        }

        try:
            with httpx.Client(timeout=120) as client:
                resp = client.post(
                    f"{BASE_URL}/models/{MODEL}:generateContent",
                    headers=headers,
                    json=payload,
                )
            if resp.status_code == 429:
                raise RuntimeError(f"Gemini quota/rate limit: {resp.text}")
            if resp.status_code in (401, 403):
                raise RuntimeError(f"Gemini auth failed: {resp.text}")
            resp.raise_for_status()
            content = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            return {"raw": content, "provider": self.name}
        except RuntimeError:
            raise
        except Exception as e:
            raise RuntimeError(f"Gemini call failed: {e}") from e
