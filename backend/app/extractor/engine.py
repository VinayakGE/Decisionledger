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
import time
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.parsers.base import Conversation
from app.extractor.providers.anthropic_provider import AnthropicProvider
from app.extractor.providers.gemini_provider import GeminiProvider
from app.extractor.providers.cerebras_provider import CerebrasProvider
from app.extractor.providers.groq_provider import GroqProvider
from app.extractor.providers.heuristic_provider import HeuristicProvider

logger = logging.getLogger(__name__)

# Provider chain — tried in order; first success wins
_PROVIDERS = [AnthropicProvider(), GeminiProvider(), CerebrasProvider(), GroqProvider(), HeuristicProvider()]


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
    provider_used = "unknown"
    extraction_status = "completed"
    merged_chain: List[Dict[str, str]] = []
    any_success = False
    any_failure = False

    for conv in conversations:
        analysis = analyse_conversation(conv)
        if analysis is None:
            any_failure = True
            continue
        any_success = True
        for e in analysis.entities:
            e["conversation_title"] = analysis.conversation_name
            e["conversation_ts"] = analysis.conversation_ts
            e["behavioral_pattern"] = analysis.behavioral_pattern
            e["provider_used"] = analysis.provider_used
        all_entities.extend(analysis.entities)
        provider_used = analysis.provider_used
        for step in analysis.fallback_chain:
            if step not in merged_chain:
                merged_chain.append(step)

    if any_success and any_failure:
        extraction_status = "partial"
    elif not any_success:
        extraction_status = "failed"
    elif provider_used == "heuristic":
        extraction_status = "heuristic_fallback"

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

    for provider in _PROVIDERS:
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
