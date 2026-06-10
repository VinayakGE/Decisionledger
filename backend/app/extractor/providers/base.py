"""Abstract provider interface."""
from abc import ABC, abstractmethod
from typing import Dict, Any
from app.parsers.base import Conversation


class ExtractionProvider(ABC):
    name: str = "base"

    @abstractmethod
    def extract(self, conv: Conversation) -> Dict[str, Any]:
        """Return a single analysis dict for the conversation.
        Raises RuntimeError on quota/auth failure so the chain can fall through."""

    def _truncate(self, text: str, max_chars: int) -> str:
        if len(text) <= max_chars:
            return text
        half = max_chars // 2
        return text[:half] + "\n\n[... middle truncated for length ...]\n\n" + text[-half:]
