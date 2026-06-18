"""Persist extracted entities to the database."""

import json
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models.orm import (
    ActionItem,
    ActionStatus,
    Constraint,
    ConversationSource,
    Decision,
    Evidence,
    Goal,
    GoalStatus,
    OpenQuestion,
    Reason,
)

_JUNK_DESCRIPTIONS = {"unknown", "n/a", "none", "null", "tbd", ""}

def _is_quality(e: Dict[str, Any]) -> bool:
    """Return False for low-quality entities that should not be persisted."""
    desc = (e.get("description") or "").strip()
    if desc.lower() in _JUNK_DESCRIPTIONS:
        return False
    if len(desc) < 12:
        return False
    if _clamp(e.get("confidence", 0.0)) < 0.35:
        return False
    return True


def persist_entities(
    db: Session,
    entities: List[Dict[str, Any]],
    source_id: int,
) -> int:
    """Write entities to DB. Returns count of rows created."""
    # Collect unique behavioral patterns and store on the source record.
    _store_behavioral_notes(db, entities, source_id)

    count = 0
    # first pass: create decisions so reasons/evidence can link to them
    decision_map: Dict[str, int] = {}  # title → id

    for e in entities:
        if e.get("type") != "decision":
            continue
        title = (e.get("title") or "").strip()
        if not title or title.lower() in _JUNK_DESCRIPTIONS or len(title) < 5:
            continue
        if _clamp(e.get("confidence", 0.0)) < 0.35:
            continue
        d = _make_decision(e, source_id)
        db.add(d)
        db.flush()
        decision_map[e.get("title", "").lower()] = d.id
        count += 1

    for e in entities:
        entity_type = e.get("type")
        if entity_type == "decision":
            continue

        if not _is_quality(e):
            continue

        linked_id = _resolve_link(e, decision_map)

        if entity_type == "reason":
            db.add(
                Reason(
                    linked_decision_id=linked_id,
                    description=e.get("description") or "Unknown",
                    confidence=_clamp(e.get("confidence", 0.0)),
                )
            )
        elif entity_type == "evidence":
            db.add(
                Evidence(
                    linked_decision_id=linked_id,
                    description=e.get("description") or "Unknown",
                    source_reference=e.get("conversation_title"),
                )
            )
        elif entity_type == "goal":
            db.add(
                Goal(
                    description=e.get("description") or "Unknown",
                    status=GoalStatus.unknown,
                    confidence=_clamp(e.get("confidence", 0.0)),
                    source_reference=e.get("conversation_title"),
                    supporting_snippet=e.get("supporting_snippet"),
                    timestamp=e.get("conversation_ts"),
                    source_id=source_id,
                )
            )
        elif entity_type == "constraint":
            db.add(
                Constraint(
                    description=e.get("description") or "Unknown",
                    confidence=_clamp(e.get("confidence", 0.0)),
                    source_reference=e.get("conversation_title"),
                    supporting_snippet=e.get("supporting_snippet"),
                    timestamp=e.get("conversation_ts"),
                    source_id=source_id,
                )
            )
        elif entity_type == "open_question":
            db.add(
                OpenQuestion(
                    description=e.get("description") or "Unknown",
                    confidence=_clamp(e.get("confidence", 0.0)),
                    source_reference=e.get("conversation_title"),
                    supporting_snippet=e.get("supporting_snippet"),
                    timestamp=e.get("conversation_ts"),
                    source_id=source_id,
                )
            )
        elif entity_type == "action_item":
            db.add(
                ActionItem(
                    description=e.get("description") or "Unknown",
                    status=ActionStatus.unknown,
                    confidence=_clamp(e.get("confidence", 0.0)),
                    source_reference=e.get("conversation_title"),
                    supporting_snippet=e.get("supporting_snippet"),
                    timestamp=e.get("conversation_ts"),
                    source_id=source_id,
                )
            )
        else:
            continue
        count += 1

    db.commit()
    return count


def _make_decision(e: Dict[str, Any], source_id: int) -> Decision:
    return Decision(
        title=e.get("title") or "Unknown",
        description=e.get("description"),
        timestamp=e.get("conversation_ts"),
        confidence=_clamp(e.get("confidence", 0.0)),
        source_reference=e.get("conversation_title"),
        supporting_snippet=e.get("supporting_snippet"),
        source_id=source_id,
    )


def _resolve_link(e: Dict[str, Any], decision_map: Dict[str, int]):
    linked = (e.get("linked_to") or "").lower().strip()
    if linked and linked in decision_map:
        return decision_map[linked]
    # fuzzy: find a key that contains the linked_to string
    for key, did in decision_map.items():
        if linked and (linked in key or key in linked):
            return did
    return None


def _clamp(v) -> float:
    try:
        return max(0.0, min(1.0, float(v)))
    except Exception:
        return 0.0


def _store_behavioral_notes(db: Session, entities: List[Dict[str, Any]], source_id: int) -> None:
    """Collect unique behavioral pattern strings from entity stamps and persist on the source."""
    seen: set = set()
    notes: List[str] = []
    for e in entities:
        bp = (e.get("behavioral_pattern") or "").strip()
        if bp and bp.lower() not in {"unknown", ""} and bp not in seen:
            seen.add(bp)
            notes.append(bp)
    if not notes:
        return
    source = db.query(ConversationSource).filter(ConversationSource.id == source_id).first()
    if source is None:
        return
    # Merge with any previously stored notes (e.g. re-analysis).
    existing: List[str] = []
    if source.behavioral_notes_json:
        try:
            existing = json.loads(source.behavioral_notes_json)
        except Exception:
            existing = []
    merged = list(dict.fromkeys(existing + notes))  # deduplicate while preserving order
    source.behavioral_notes_json = json.dumps(merged)
    db.add(source)
