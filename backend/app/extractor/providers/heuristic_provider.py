"""Rule-based heuristic provider — zero-dependency fallback when all API providers fail.

Uses regex patterns to extract entities from conversation text.
Lower recall than LLM-based providers but always available.
"""
import re
import json
import logging
from typing import Dict, Any, List
from app.parsers.base import Conversation
from app.extractor.providers.base import ExtractionProvider

logger = logging.getLogger(__name__)

MAX_CHARS = 800_000

# Patterns per entity type: (regex, label)
_DECISION_PATTERNS = [
    r"(?:we|i|team)(?:'ve|'ll)?\s+(?:decided|agreed|resolved|chosen|going)\s+to\s+([^.!?\n]{10,120})",
    r"decision(?:\s+is)?:\s*([^.\n]{10,120})",
    r"(?:will|shall)\s+(?:go\s+with|use|adopt|implement|hire|not\s+hire)\s+([^.!?\n]{5,100})",
    r"(?:no\s+longer|stop(?:ping)?|dropping|cutting)\s+([^.!?\n]{5,80})",
]

_GOAL_PATTERNS = [
    r"(?:goal|target|aim|objective|want)\s+(?:is\s+)?(?:to\s+)?([^.!?\n]{10,120})",
    r"(?:reach|achieve|get\s+to|grow\s+to)\s+([^.!?\n]{5,80})",
    r"(?:by|before)\s+(?:end\s+of\s+)?(?:Q[1-4]|january|february|march|april|may|june|july|august|september|october|november|december)[^,.\n]*,\s+([^.!\n]{5,80})",
]

_ACTION_PATTERNS = [
    r"(?:action|todo|task|next\s+step)s?(?:\s+items?)?[:\-]\s*([^.\n]{5,100})",
    r"(?:\w+)\s+(?:will|must|needs?\s+to|should)\s+([^.!?\n]{5,100})\s+(?:by|before|this\s+week|today|tomorrow)",
    r"(?:follow[\s-]up|deliverable)[:\s]+([^.\n]{5,100})",
]

_CONSTRAINT_PATTERNS = [
    r"(?:constraint|limit|budget|runway|deadline|blocker)[:\s]+([^.\n]{5,120})",
    r"(?:only|just)\s+(?:\d+\s+)?(?:months?|weeks?|days?)\s+(?:of\s+)?runway",
    r"(?:can't|cannot|won't|not\s+able\s+to)\s+([^.!?\n]{5,80})",
    r"\$[\d,]+[km]?\s+(?:burn|runway|budget|ARR|MRR)",
]

_EVIDENCE_PATTERNS = [
    r"(?:customer|user|data|research|study|survey|pilot)\s+(?:said|showed?|found|confirmed|indicated)\s+([^.!?\n]{10,120})",
    r"(?:\d+)\s+(?:customers?|users?|clients?)\s+(?:said|mentioned|reported|confirmed)\s+([^.!?\n]{10,120})",
    r"(?:according\s+to|based\s+on)\s+([^,.\n]{5,100})",
]

_QUESTION_PATTERNS = [
    r"(?:question|wondering|unsure|unclear|open)[:\s]+([^.?\n]{10,120}\??)",
    r"(?:should\s+we|do\s+we|when\s+should|how\s+do\s+we|what\s+(?:is|are|should))[^.!?\n]{10,100}\?",
    r"(?:not\s+(?:sure|certain|clear))\s+(?:about|whether|if)\s+([^.!\n]{10,100})",
]

_REASON_PATTERNS = [
    r"(?:because|since|as|given\s+that|due\s+to)\s+([^.!?\n]{10,120})",
    r"(?:reason|rationale|why)[:\s]+([^.\n]{10,120})",
    r"(?:this\s+(?:makes?|is)\s+(?:sense|better|right))\s+(?:because|since)\s+([^.!\n]{10,100})",
]


def _extract_matches(text: str, patterns: List[str], entity_type: str) -> List[Dict]:
    entities = []
    seen = set()
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            snippet = m.group(0).strip()
            desc = (m.group(1) if m.lastindex and m.lastindex >= 1 else snippet).strip()
            desc = re.sub(r'\s+', ' ', desc)[:200]
            key = desc.lower()[:60]
            if key in seen or len(desc) < 8:
                continue
            seen.add(key)
            entities.append({
                "type": entity_type,
                "description": desc,
                "confidence": 0.45,
                "snippet": snippet[:300],
                "linked_to": None,
            })
    return entities


class HeuristicProvider(ExtractionProvider):
    name = "heuristic"

    def extract(self, conv: Conversation) -> Dict[str, Any]:
        text = self._truncate(conv.full_text(), MAX_CHARS)

        entities: List[Dict] = []
        entities += _extract_matches(text, _DECISION_PATTERNS, "decision")
        entities += _extract_matches(text, _GOAL_PATTERNS, "goal")
        entities += _extract_matches(text, _ACTION_PATTERNS, "action_item")
        entities += _extract_matches(text, _CONSTRAINT_PATTERNS, "constraint")
        entities += _extract_matches(text, _EVIDENCE_PATTERNS, "evidence")
        entities += _extract_matches(text, _QUESTION_PATTERNS, "open_question")
        entities += _extract_matches(text, _REASON_PATTERNS, "reason")

        # Derive a minimal conversation name and behavioral pattern
        title = conv.title or "Conversation"
        pattern = f"Rule-based extraction from '{title}' — {len(entities)} entities found via pattern matching."

        result = {
            "conversation_name": title,
            "behavioral_pattern": pattern,
            "entities": entities,
        }
        return {"raw": json.dumps(result), "provider": self.name}
