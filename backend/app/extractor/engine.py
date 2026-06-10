"""Extraction engine — one API call per conversation, provider fallback chain.

Provider order:  Anthropic (primary)  →  Gemini Flash  →  Cerebras (free-tier fallback)

Each conversation produces ONE ConversationAnalysis:
  - conversation_name
  - behavioral_pattern  (how the founder reasons, not just what they decided)
  - entities            (all types, flat list)
"""

import json
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.parsers.base import Conversation
from app.extractor.providers.anthropic_provider import AnthropicProvider
from app.extractor.providers.gemini_provider import GeminiProvider
from app.extractor.providers.cerebras_provider import CerebrasProvider

logger = logging.getLogger(__name__)

# Provider chain — tried in order; first success wins
_PROVIDERS = [AnthropicProvider(), GeminiProvider(), CerebrasProvider()]


@dataclass
class ConversationAnalysis:
    conversation_name: str
    behavioral_pattern: str
    entities: List[Dict[str, Any]] = field(default_factory=list)
    provider_used: str = "unknown"
    conversation_ts: Optional[datetime] = None
    source_title: str = ""


def extract_from_conversation(conv: Conversation) -> List[Dict[str, Any]]:
    """Backwards-compatible shim used by the upload API and evaluation runner.
    Returns a flat list of entity dicts (stamped with conversation metadata).
    """
    analysis = analyse_conversation(conv)
    if analysis is None:
        return []

    for e in analysis.entities:
        e["conversation_title"] = analysis.conversation_name
        e["conversation_ts"] = analysis.conversation_ts
        e["behavioral_pattern"] = analysis.behavioral_pattern
        e["provider_used"] = analysis.provider_used

    return analysis.entities


def analyse_conversation(conv: Conversation) -> Optional[ConversationAnalysis]:
    """Return a single ConversationAnalysis for the conversation, or None on total failure."""
    last_error = None

    for provider in _PROVIDERS:
        try:
            logger.info("Trying provider '%s' for conversation '%s'", provider.name, conv.title)
            result = provider.extract(conv)
            parsed = _parse_response(result["raw"])
            if parsed is None:
                logger.warning("Provider '%s' returned unparseable response.", provider.name)
                continue

            entities = parsed.get("entities", [])
            return ConversationAnalysis(
                conversation_name=parsed.get("conversation_name") or conv.title,
                behavioral_pattern=parsed.get("behavioral_pattern") or "Unknown",
                entities=entities,
                provider_used=result["provider"],
                conversation_ts=conv.created_at,
                source_title=conv.title,
            )
        except RuntimeError as e:
            last_error = e
            logger.warning("Provider '%s' failed: %s — trying next.", provider.name, e)
            continue

    logger.error("All providers failed for conversation '%s'. Last error: %s", conv.title, last_error)
    return None


def _parse_response(raw: str) -> Optional[Dict]:
    raw = raw.strip()
    # strip markdown fences
    if raw.startswith("```"):
        lines = raw.splitlines()
        inner = lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
        raw = "\n".join(inner)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(raw[start:end])
            except Exception:
                pass
    return None
