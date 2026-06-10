"""Google Gemini Flash provider (free-tier fallback).

Free tier limits (as of 2025):
  gemini-1.5-flash: 15 RPM, 1 million tokens/day — no hard monthly cap.
  Context window: 1M tokens — no chunking needed.

Get a free key at: https://aistudio.google.com/app/apikey
Set GEMINI_API_KEY in .env
"""
import logging
from typing import Dict, Any
from app.parsers.base import Conversation
from app.extractor.providers.base import ExtractionProvider
from app.extractor.prompts import SYSTEM_PROMPT, USER_TEMPLATE
from app.config import settings

logger = logging.getLogger(__name__)

# 1M token context; 4 chars ≈ 1 token → ~3.5M chars safe limit; use 800k to be safe
MAX_CHARS = 800_000
MODEL = "gemini-1.5-flash"


class GeminiProvider(ExtractionProvider):
    name = "gemini"

    def extract(self, conv: Conversation) -> Dict[str, Any]:
        if not settings.gemini_api_key:
            raise RuntimeError("No Gemini API key configured.")

        try:
            import google.generativeai as genai
        except ImportError:
            raise RuntimeError("google-generativeai not installed.")

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(
            model_name=MODEL,
            system_instruction=SYSTEM_PROMPT,
        )

        text = self._truncate(conv.full_text(), MAX_CHARS)
        ts = conv.created_at.isoformat() if conv.created_at else "unknown"
        user_msg = USER_TEMPLATE.format(title=conv.title, timestamp=ts, text=text)

        try:
            response = model.generate_content(
                user_msg,
                generation_config={"max_output_tokens": 4096, "temperature": 0.1},
            )
            return {"raw": response.text, "provider": self.name}
        except Exception as e:
            err = str(e).lower()
            if "quota" in err or "rate" in err or "limit" in err:
                raise RuntimeError(f"Gemini quota/rate limit: {e}") from e
            if "api_key" in err or "auth" in err or "credential" in err:
                raise RuntimeError(f"Gemini auth failed: {e}") from e
            raise RuntimeError(f"Gemini call failed: {e}") from e
