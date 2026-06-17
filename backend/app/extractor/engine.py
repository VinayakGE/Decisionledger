"""Extraction engine — one API call per conversation, provider fallback chain.

Provider order:  Anthropic (primary)  →  Gemini Flash  →  Cerebras  →  Groq  →  Heuristic

Each conversation produces ONE ConversationAnalysis:
  - conversation_name
  - behavioral_pattern  (how the founder reasons, not just what they decided)
  - entities            (all types, flat list)
  - fallback_chain      (which providers were tried, in order, with outcome)
"""

import json
import logging
import os
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.extractor.providers.anthropic_provider import AnthropicProvider
from app.extractor.providers.cerebras_provider import CerebrasProvider
from app.extractor.providers.gemini_provider import GeminiProvider
from app.extractor.providers.groq_provider import GroqProvider
from app.extractor.providers.heuristic_provider import HeuristicProvider
from app.parsers.base import Conversation

logger = logging.getLogger(__name__)

# LLM providers only run in production (REPLIT_DEPLOYMENT=1) or when
# explicitly enabled via ENABLE_LLM_EXTRACTION=true. This prevents burning
# API tokens during local development and testing.
_LLM_ENABLED = bool(
    os.environ.get("REPLIT_DEPLOYMENT") or
    os.environ.get("ENABLE_LLM_EXTRACTION", "").lower() in ("1", "true", "yes")
)

if _LLM_ENABLED:
    logger.info("LLM extraction ENABLED (production mode) — full provider chain active.")
else:
    logger.info("LLM extraction DISABLED (dev mode) — heuristic only. Set ENABLE_LLM_EXTRACTION=true to override.")

# Provider chain — tried in order; first success wins.
# In dev mode, LLM providers are excluded to avoid spending API tokens.
_LLM_PROVIDERS = [
    AnthropicProvider(),
    GeminiProvider(),
    CerebrasProvider(),
    GroqProvider(),
]
_HEURISTIC = HeuristicProvider()

def _get_providers() -> List:
    if _LLM_ENABLED:
        return [*_LLM_PROVIDERS, _HEURISTIC]
    return [_HEURISTIC]


@dataclass
class ConversationAnalysis:
    conversation_name: str
    behavioral_pattern: str
    entities: List[Dict[str, Any]] = field(default_factory=list)
    provider_used: str = "unknown"
    conversation_ts: Optional[datetime] = None
    source_title: str = ""
    fallback_chain: List[Dict[str, str]] = field(default_factory=list)


@dataclass
class ExtractionResult:
    """Aggregate result for a full source upload (multiple conversations)."""

    entities: List[Dict[str, Any]] = field(default_factory=list)
    provider_used: str = "unknown"
    extraction_status: str = "completed"
    fallback_chain: List[Dict[str, str]] = field(default_factory=list)
    duration_ms: int = 0


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


def extract_source(conversations: List[Conversation]) -> ExtractionResult:
    """Extract entities from all conversations in a source upload.
    Returns an ExtractionResult with aggregate observability metadata.
    """
    start = time.monotonic()
    all_entities: List[Dict[str, Any]] = []
    providers_seen: set = set()
    merged_chain: List[Dict[str, str]] = []
    any_success = False
    any_failure = False

    for conv in conversations:
        analysis = analyse_conversation(conv)
        if analysis is None:
            any_failure = True
            continue
        any_success = True
        providers_seen.add(analysis.provider_used)
        for e in analysis.entities:
            e["conversation_title"] = analysis.conversation_name
            e["conversation_ts"] = analysis.conversation_ts
            e["behavioral_pattern"] = analysis.behavioral_pattern
            e["provider_used"] = analysis.provider_used
        all_entities.extend(analysis.entities)
        for step in analysis.fallback_chain:
            if step not in merged_chain:
                merged_chain.append(step)

    # Aggregate provider label: single name when unanimous, "mixed" otherwise.
    if not providers_seen:
        provider_used = "none"
    elif len(providers_seen) == 1:
        provider_used = next(iter(providers_seen))
    else:
        provider_used = "mixed"

    # Derive status from outcome, not just provider name.
    if not any_success:
        extraction_status = "failed"
    elif any_failure:
        extraction_status = "partial"
    elif provider_used == "heuristic":
        extraction_status = "heuristic_fallback"
    elif provider_used == "mixed" and "heuristic" in providers_seen:
        extraction_status = "completed_with_fallback"
    else:
        extraction_status = "completed"

    return ExtractionResult(
        entities=all_entities,
        provider_used=provider_used,
        extraction_status=extraction_status,
        fallback_chain=merged_chain,
        duration_ms=int((time.monotonic() - start) * 1000),
    )


def analyse_conversation(conv: Conversation) -> Optional[ConversationAnalysis]:
    """Return a single ConversationAnalysis for the conversation, or None on total failure."""
    last_error = None
    chain: List[Dict[str, str]] = []

    for provider in _get_providers():
        try:
            logger.info("Trying provider '%s' for conversation '%s'", provider.name, conv.title)
            result = provider.extract(conv)
            parsed = _parse_response(result["raw"])
            if parsed is None:
                logger.warning("Provider '%s' returned unparseable response.", provider.name)
                chain.append({"provider": provider.name, "status": "unparseable"})
                continue

            chain.append({"provider": provider.name, "status": "success"})
            entities = parsed.get("entities", [])
            return ConversationAnalysis(
                conversation_name=parsed.get("conversation_name") or conv.title,
                behavioral_pattern=parsed.get("behavioral_pattern") or "Unknown",
                entities=entities,
                provider_used=result["provider"],
                conversation_ts=conv.created_at,
                source_title=conv.title,
                fallback_chain=chain,
            )
        except RuntimeError as e:
            last_error = e
            chain.append({"provider": provider.name, "status": "failed", "error": str(e)[:120]})
            logger.warning("Provider '%s' failed: %s — trying next.", provider.name, e)
            continue

    logger.error(
        "All providers failed for conversation '%s'. Last error: %s", conv.title, last_error
    )
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
