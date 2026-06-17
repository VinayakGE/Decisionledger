"""Soft-match extracted entities against ground truth using semantic similarity.

We use cosine similarity on sentence embeddings rather than exact string match
because the extraction engine will paraphrase — that's expected and fine.

A match is declared when similarity >= MATCH_THRESHOLD.
Unmatched ground-truth items = false negatives (recall misses).
Unmatched extracted items   = false positives (hallucinations / over-extractions).
"""

from typing import List, Tuple, Dict
from dataclasses import dataclass, field

MATCH_THRESHOLD = 0.72   # cosine similarity for a soft match

try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    _ST_AVAILABLE = True
except ImportError:
    _ST_AVAILABLE = False

_MODEL = None  # loaded lazily on first use


def _get_model():
    global _MODEL
    if _MODEL is None and _ST_AVAILABLE:
        try:
            _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception:
            pass
    return _MODEL


@dataclass
class MatchResult:
    entity_type: str
    true_positives: List[Tuple[str, str, float]] = field(default_factory=list)   # (gt, extracted, sim)
    false_positives: List[str] = field(default_factory=list)                      # extracted with no GT match
    false_negatives: List[str] = field(default_factory=list)                      # GT with no extracted match
    ambiguous_missed: List[str] = field(default_factory=list)                     # GT flagged ambiguous, not found

    @property
    def precision(self) -> float:
        denom = len(self.true_positives) + len(self.false_positives)
        return len(self.true_positives) / denom if denom else 0.0

    @property
    def recall(self) -> float:
        # exclude ambiguous from recall denominator — it's unfair to penalise for these
        denom = len(self.true_positives) + len(self.false_negatives)
        return len(self.true_positives) / denom if denom else 0.0

    @property
    def f1(self) -> float:
        p, r = self.precision, self.recall
        return 2 * p * r / (p + r) if (p + r) else 0.0


def match_entities(
    ground_truth: List[Dict],     # list of {"description": str, "ambiguous": bool, ...}
    extracted: List[str],          # list of description strings from the engine
    entity_type: str,
) -> MatchResult:
    result = MatchResult(entity_type=entity_type)
    if not ground_truth and not extracted:
        return result

    gt_texts = [g["description"] for g in ground_truth]
    gt_ambiguous = {g["description"] for g in ground_truth if g.get("ambiguous")}

    if not extracted:
        for g in gt_texts:
            if g in gt_ambiguous:
                result.ambiguous_missed.append(g)
            else:
                result.false_negatives.append(g)
        return result

    if not gt_texts:
        result.false_positives.extend(extracted)
        return result

    # compute similarity matrix
    similarities = _similarity_matrix(gt_texts, extracted)

    gt_matched = set()
    ext_matched = set()

    # greedy best-match: pair highest-similarity pairs first
    pairs = []
    for i, gt in enumerate(gt_texts):
        for j, ext in enumerate(extracted):
            pairs.append((similarities[i][j], i, j))
    pairs.sort(reverse=True)

    for sim, i, j in pairs:
        if i in gt_matched or j in ext_matched:
            continue
        if sim >= MATCH_THRESHOLD:
            result.true_positives.append((gt_texts[i], extracted[j], round(sim, 3)))
            gt_matched.add(i)
            ext_matched.add(j)

    for i, gt in enumerate(gt_texts):
        if i not in gt_matched:
            if gt in gt_ambiguous:
                result.ambiguous_missed.append(gt)
            else:
                result.false_negatives.append(gt)

    for j, ext in enumerate(extracted):
        if j not in ext_matched:
            result.false_positives.append(ext)

    return result


def _similarity_matrix(texts_a: List[str], texts_b: List[str]):
    model = _get_model()
    if not _ST_AVAILABLE or model is None:
        return _jaccard_matrix(texts_a, texts_b)
    import numpy as np
    emb_a = model.encode(texts_a, show_progress_bar=False)
    emb_b = model.encode(texts_b, show_progress_bar=False)
    # cosine similarity
    norms_a = np.linalg.norm(emb_a, axis=1, keepdims=True)
    norms_b = np.linalg.norm(emb_b, axis=1, keepdims=True)
    emb_a = emb_a / np.clip(norms_a, 1e-9, None)
    emb_b = emb_b / np.clip(norms_b, 1e-9, None)
    return emb_a @ emb_b.T


def _jaccard_matrix(texts_a, texts_b):
    def jaccard(a, b):
        sa = set(a.lower().split())
        sb = set(b.lower().split())
        return len(sa & sb) / max(len(sa | sb), 1)
    return [[jaccard(a, b) for b in texts_b] for a in texts_a]
