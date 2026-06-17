"""Anthropic Claude provider (primary)."""

import logging
from typing import Any, Dict

import anthropic

from app.config import settings
from app.extractor.prompts import SYSTEM_PROMPT, USER_TEMPLATE
from app.extractor.providers.base import ExtractionProvider
from app.parsers.base import Conversation

logger = logging.getLogger(__name__)

# ~100k chars ≈ ~25k tokens — well within claude-haiku's 200k context
MAX_CHARS = 100_000


class AnthropicProvider(ExtractionProvider):
    name = "anthropic"

    def extract(self, conv: Conversation) -> Dict[str, Any]:
        if not settings.anthropic_api_key:
            raise RuntimeError("No Anthropic API key configured.")

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        text = self._truncate(conv.full_text(), MAX_CHARS)
        ts = conv.created_at.isoformat() if conv.created_at else "unknown"
        user_msg = USER_TEMPLATE.format(title=conv.title, timestamp=ts, text=text)

        try:
            response = client.messages.create(
                model=settings.extraction_model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )
            return {"raw": response.content[0].text, "provider": self.name}
        except anthropic.AuthenticationError as e:
            raise RuntimeError(f"Anthropic auth failed: {e}") from e
        except anthropic.BadRequestError as e:
            if "credit" in str(e).lower() or "balance" in str(e).lower():
                raise RuntimeError(f"Anthropic quota exhausted: {e}") from e
            raise RuntimeError(f"Anthropic request error: {e}") from e
        except Exception as e:
            raise RuntimeError(f"Anthropic call failed: {e}") from e
