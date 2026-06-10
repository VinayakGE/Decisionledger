"""Google Gemini Flash provider (free-tier fallback).

Uses the new google-genai SDK (REST transport — no gRPC, no SSL cert issues).

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


class GeminiProvider(ExtractionProvider):
    name = "gemini"

    def extract(self, conv: Conversation) -> Dict[str, Any]:
        if not settings.gemini_api_key:
            raise RuntimeError("No Gemini API key configured.")

        try:
            from google import genai
            from google.genai import types
        except ImportError:
            raise RuntimeError("google-genai not installed. Run: pip install google-genai")

        client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=types.HttpOptions(api_version="v1beta"),
        )

        text = self._truncate(conv.full_text(), MAX_CHARS)
        ts = conv.created_at.isoformat() if conv.created_at else "unknown"
        user_msg = USER_TEMPLATE.format(title=conv.title, timestamp=ts, text=text)

        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=user_msg,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=4096,
                    temperature=0.1,
                ),
            )
            return {"raw": response.text, "provider": self.name}
        except Exception as e:
            err = str(e).lower()
            if "quota" in err or "rate" in err or "429" in err:
                raise RuntimeError(f"Gemini quota/rate limit: {e}") from e
            if "api_key" in err or "auth" in err or "403" in err or "invalid" in err:
                raise RuntimeError(f"Gemini auth failed: {e}") from e
            raise RuntimeError(f"Gemini call failed: {e}") from e
