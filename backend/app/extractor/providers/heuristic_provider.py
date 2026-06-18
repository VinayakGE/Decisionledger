"""Rule-based heuristic provider — zero-dependency fallback when all API providers fail.

Conservative by design: better to return nothing than to return noise.
Only extracts entities when strong signal patterns are present.
"""

import json
import logging
import re
from typing import Any, Dict, List

from app.extractor.providers.base import ExtractionProvider
from app.parsers.base import Conversation

logger = logging.getLogger(__name__)

MAX_CHARS = 800_000
MIN_DESC_LEN = 20  # Minimum meaningful description length

# High-signal patterns only — require explicit commitment language
_DECISION_PATTERNS = [
    r"(?:we|i|the\s+team)\s+(?:have\s+)?decided\s+to\s+([^.!?\n]{20,150})",
    r"(?:we|i)\s+(?:are\s+going|will\s+go)\s+with\s+([^.!?\n]{15,120})",
    r"(?:we've|we\s+have)\s+agreed\s+to\s+([^.!?\n]{15,120})",
    r"(?:the\s+)?decision\s+is\s+(?:to\s+)?([^.!\n]{20,150})",
    r"(?:we're|we\s+are)\s+(?:going\s+to|committing\s+to)\s+([^.!?\n]{15,120})",
]

_GOAL_PATTERNS = [
    r"(?:our\s+)?(?:goal|target|objective)\s+is\s+(?:to\s+)?([^.!?\n]{20,150})",
    r"(?:we\s+(?:want|need)\s+to\s+(?:reach|hit|achieve|get\s+to))\s+([^.!?\n]{15,120})",
    r"(?:aiming|targeting)\s+(?:for\s+)?([^.!?\n]{15,100})\s+by\s+(?:end\s+of\s+)?(?:Q[1-4]|\d{4}|january|february|march|april|may|june|july|august|september|october|november|december)",
]

_ACTION_PATTERNS = [
    r"(?:i|we|[\w]+)\s+(?:will|must|need\s+to)\s+([^.!?\n]{20,120})\s+(?:by|before|this\s+week|next\s+week|by\s+(?:monday|tuesday|wednesday|thursday|friday))",
    r"(?:action\s+item|next\s+step|todo)[:\s]+([^.\n]{20,120})",
    r"(?:i'll|i\s+will)\s+([^.!?\n]{20,100})\s+(?:by|before|this\s+week|today|tomorrow)",
]

_CONSTRAINT_PATTERNS = [
    r"(?:we\s+(?:only\s+have|have\s+only))\s+([^.!\n]{15,100})\s+(?:runway|months?|weeks?|budget)",
    r"(?:hard\s+(?:constraint|limit|deadline|requirement))[:\s]+([^.\n]{15,120})",
    r"(?:we\s+(?:can't|cannot|won't))\s+([^.!?\n]{15,100})\s+(?:because|due\s+to|until)",
    r"\$[\d,]+[km]?\s+(?:total\s+)?(?:burn|runway|budget|ARR|MRR)[^.!?\n]{0,80}",
]

_EVIDENCE_PATTERNS = [
    r"(\d+)\s+(?:of\s+(?:our\s+)?)?(?:customers?|users?|clients?|pilots?)\s+(?:said|mentioned|confirmed|reported)\s+([^.!?\n]{15,150})",
    r"(?:the\s+data\s+shows?|data\s+shows?|research\s+shows?)\s+(?:that\s+)?([^.!?\n]{20,150})",
    r"(?:in\s+our\s+)?(?:pilot|survey|research|interviews?)[,:\s]+(?:we\s+found\s+that\s+)?([^.!?\n]{20,150})",
]

_QUESTION_PATTERNS = [
    r"(?:open\s+question|key\s+question|big\s+question|main\s+question)[:\s]+([^.?\n]{20,150}\??)",
    r"(?:still\s+(?:unclear|unsure|undecided|open))[:\s]+(?:whether\s+|how\s+|what\s+|when\s+)?([^.!\n]{20,120})",
    r"(?:we\s+(?:haven't|have\s+not)\s+(?:decided|figured\s+out|determined))\s+([^.!?\n]{20,120})",
]

_REASON_PATTERNS = [
    r"(?:we\s+decided\s+[^.!?\n]{5,50})\s+because\s+([^.!?\n]{20,150})",
    r"(?:the\s+reason\s+(?:we|for\s+this)\s+(?:is|was))[:\s]+([^.\n]{20,150})",
    r"(?:this\s+makes\s+sense\s+because)\s+([^.!\n]{20,120})",
]


def _extract_matches(text: str, patterns: List[str], entity_type: str) -> List[Dict]:
    entities = []
    seen = set()
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            # Use the last capture group if available, otherwise full match
            if m.lastindex and m.lastindex >= 1:
                desc = m.group(m.lastindex).strip()
            else:
                desc = m.group(0).strip()
            desc = re.sub(r"\s+", " ", desc)[:200]
            key = desc.lower()[:80]
            if key in seen or len(desc) < MIN_DESC_LEN:
                continue
            seen.add(key)
            snippet = m.group(0).strip()[:200]
            entities.append({
                "type": entity_type,
                "description": desc,
                "confidence": 0.52,  # Honest: heuristic is low-confidence
                "supporting_snippet": snippet,
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

        title = conv.title or "Conversation"
        quality_note = f"Heuristic extraction from '{title}' — {len(entities)} entities found. Confidence is approximate; verify against source."

        result = {
            "conversation_name": title,
            "behavioral_pattern": quality_note,
            "entities": entities,
        }
        return {"raw": json.dumps(result), "provider": self.name}
