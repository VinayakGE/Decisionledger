"""Insight engine — generates meta-analysis over stored entities."""
import logging
from typing import List, Optional
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.orm import Decision, Goal, OpenQuestion, ActionItem
from app.models.schemas import (
    RecurringQuestionGroup, DecisionReversal, BlindSpot, InsightReport,
    DecisionOut, GoalOut,
)
from app.config import settings

logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    _ST_AVAILABLE = True
except ImportError:
    _ST_AVAILABLE = False
    logger.warning("sentence-transformers not available — semantic similarity disabled.")

_model: Optional[object] = None


def _get_model():
    global _model
    if _model is None and _ST_AVAILABLE:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _cosine(a, b) -> float:
    import numpy as np
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def generate_insights(db: Session) -> InsightReport:
    questions = db.query(OpenQuestion).all()
    decisions = db.query(Decision).all()
    goals = db.query(Goal).all()
    action_items = db.query(ActionItem).all()

    recurring = _find_recurring_questions(questions)
    reversals = _find_decision_reversals(decisions)
    top_goals = _rank_goals(goals)
    blind_spots = _find_blind_spots(questions, action_items)

    return InsightReport(
        recurring_questions=recurring,
        decision_reversals=reversals,
        top_goals=[GoalOut.model_validate(g) for g in top_goals[:10]],
        blind_spots=blind_spots,
        total_decisions=len(decisions),
        total_open_questions=len(questions),
        total_action_items=len(action_items),
    )


def _find_recurring_questions(questions: List[OpenQuestion]) -> List[RecurringQuestionGroup]:
    if not questions:
        return []

    texts = [q.description for q in questions]
    model = _get_model()

    if model is None or not _ST_AVAILABLE:
        # fallback: exact substring grouping
        return _group_by_overlap(texts)

    import numpy as np
    embeddings = model.encode(texts, show_progress_bar=False)
    threshold = settings.similarity_threshold
    used = [False] * len(texts)
    groups: List[RecurringQuestionGroup] = []

    for i in range(len(texts)):
        if used[i]:
            continue
        cluster = [texts[i]]
        for j in range(i + 1, len(texts)):
            if used[j]:
                continue
            sim = _cosine(embeddings[i], embeddings[j])
            if sim >= threshold:
                cluster.append(texts[j])
                used[j] = True
        used[i] = True
        if len(cluster) > 1:
            groups.append(RecurringQuestionGroup(
                representative=cluster[0],
                occurrences=cluster,
                count=len(cluster),
            ))

    return sorted(groups, key=lambda g: g.count, reverse=True)


def _group_by_overlap(texts: List[str]) -> List[RecurringQuestionGroup]:
    used = [False] * len(texts)
    groups = []
    for i in range(len(texts)):
        if used[i]:
            continue
        cluster = [texts[i]]
        words_i = set(texts[i].lower().split())
        for j in range(i + 1, len(texts)):
            if used[j]:
                continue
            words_j = set(texts[j].lower().split())
            overlap = len(words_i & words_j) / max(len(words_i | words_j), 1)
            if overlap >= 0.5:
                cluster.append(texts[j])
                used[j] = True
        used[i] = True
        if len(cluster) > 1:
            groups.append(RecurringQuestionGroup(
                representative=cluster[0],
                occurrences=cluster,
                count=len(cluster),
            ))
    return groups


def _find_decision_reversals(decisions: List[Decision]) -> List[DecisionReversal]:
    if len(decisions) < 2:
        return []

    texts = [f"{d.title} {d.description or ''}" for d in decisions]
    model = _get_model()

    if model is None or not _ST_AVAILABLE:
        return []

    embeddings = model.encode(texts, show_progress_bar=False)
    threshold = settings.similarity_threshold
    reversals = []
    used = set()

    for i in range(len(decisions)):
        for j in range(i + 1, len(decisions)):
            if (i, j) in used:
                continue
            sim = _cosine(embeddings[i], embeddings[j])
            if sim >= threshold:
                # same topic — check if timestamps differ (reversal candidate)
                d_i, d_j = decisions[i], decisions[j]
                if d_i.timestamp and d_j.timestamp and d_i.timestamp != d_j.timestamp:
                    older, newer = (d_i, d_j) if d_i.timestamp < d_j.timestamp else (d_j, d_i)
                    reversals.append(DecisionReversal(
                        original=DecisionOut.model_validate(older),
                        reversal=DecisionOut.model_validate(newer),
                        similarity=round(sim, 3),
                    ))
                    used.add((i, j))

    return reversals


def _rank_goals(goals: List[Goal]) -> List[Goal]:
    # aggregate by description similarity; increment frequency
    if not goals:
        return []
    # simple: sort by frequency desc, then confidence desc
    return sorted(goals, key=lambda g: (g.frequency, g.confidence), reverse=True)


def _find_blind_spots(
    questions: List[OpenQuestion],
    action_items: List[ActionItem],
) -> List[BlindSpot]:
    """Topics discussed often but rarely acted upon."""
    topic_discuss: defaultdict = defaultdict(int)
    topic_act: defaultdict = defaultdict(int)

    for q in questions:
        key = _topic_key(q.description)
        topic_discuss[key] += 1

    for a in action_items:
        key = _topic_key(a.description)
        topic_act[key] += 1

    spots: List[BlindSpot] = []
    for topic, discuss_count in topic_discuss.items():
        act_count = topic_act.get(topic, 0)
        ratio = act_count / discuss_count if discuss_count else 0.0
        if discuss_count >= 2 and ratio < 0.3:
            spots.append(BlindSpot(
                topic=topic,
                discussion_count=discuss_count,
                action_count=act_count,
                ratio=round(ratio, 3),
            ))

    return sorted(spots, key=lambda s: s.discussion_count, reverse=True)[:10]


def _topic_key(text: str) -> str:
    # crude: first 5 significant words
    stop = {"the", "a", "an", "is", "are", "was", "we", "i", "to", "do", "our", "about"}
    words = [w.lower().strip("?.,!:") for w in text.split() if w.lower() not in stop]
    return " ".join(words[:5])
