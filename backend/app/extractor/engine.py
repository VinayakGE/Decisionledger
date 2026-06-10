"""Entity extraction engine using the Anthropic API."""
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import anthropic
from app.config import settings
from app.parsers.base import Conversation
from app.extractor.prompts import SYSTEM_PROMPT, USER_TEMPLATE

logger = logging.getLogger(__name__)

# max chars sent per API call to stay within token limits
CHUNK_SIZE = 12_000


def extract_from_conversation(conv: Conversation) -> List[Dict[str, Any]]:
    """Return raw entity dicts extracted from a single conversation."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    full_text = conv.full_text()
    chunks = _chunk_text(full_text, CHUNK_SIZE)
    all_entities: List[Dict[str, Any]] = []

    for chunk in chunks:
        ts_str = conv.created_at.isoformat() if conv.created_at else "unknown"
        user_msg = USER_TEMPLATE.format(
            title=conv.title,
            timestamp=ts_str,
            text=chunk,
        )
        try:
            response = client.messages.create(
                model=settings.extraction_model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )
            raw = response.content[0].text
            parsed = _safe_parse(raw)
            entities = parsed.get("entities", [])
            # stamp conversation metadata onto each entity
            for e in entities:
                e["conversation_title"] = conv.title
                e["conversation_ts"] = conv.created_at
            all_entities.extend(entities)
        except anthropic.AuthenticationError:
            logger.error("Invalid Anthropic API key — entity extraction skipped.")
            return []
        except Exception as exc:
            logger.warning("Extraction call failed: %s", exc)

    return all_entities


def _safe_parse(raw: str) -> Dict:
    # strip markdown fences if present
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # try to extract JSON object from the response
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(raw[start:end])
            except Exception:
                pass
    return {"entities": []}


def _chunk_text(text: str, size: int) -> List[str]:
    if len(text) <= size:
        return [text]
    chunks = []
    while text:
        chunks.append(text[:size])
        text = text[size:]
    return chunks
