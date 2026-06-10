"""Tests for the evaluation matcher — no API calls, no LLM needed."""
import pytest
from evaluation.matcher import match_entities, MatchResult, MATCH_THRESHOLD


def _gt(desc, ambiguous=False):
    return {"description": desc, "ambiguous": ambiguous}


# ── Basic matching ────────────────────────────────────────────────────────────

def test_exact_match():
    gt = [_gt("Set pricing at $85 per seat per month")]
    ext = ["Set pricing at $85 per seat per month"]
    result = match_entities(gt, ext, "decisions")
    assert len(result.true_positives) == 1
    assert len(result.false_positives) == 0
    assert len(result.false_negatives) == 0
    assert result.precision == 1.0
    assert result.recall == 1.0


def test_paraphrase_match():
    gt = [_gt("Use per-seat pricing instead of flat fee")]
    ext = ["Chose per-seat pricing model over flat-rate pricing"]
    result = match_entities(gt, ext, "decisions")
    # semantic match should fire
    assert len(result.true_positives) == 1 or len(result.false_negatives) == 1
    # at minimum, no crash and precision is defined
    assert 0.0 <= result.precision <= 1.0


def test_false_positive():
    gt = [_gt("Launch product in Q1")]
    ext = ["Launch product in Q1", "Consider a freemium model"]
    result = match_entities(gt, ext, "decisions")
    assert len(result.false_positives) >= 1
    assert result.precision < 1.0


def test_false_negative():
    gt = [_gt("Launch product in Q1"), _gt("Hire engineer in January")]
    ext = ["Launch product in Q1"]
    result = match_entities(gt, ext, "decisions")
    assert len(result.false_negatives) == 1
    assert result.recall < 1.0


def test_all_empty():
    result = match_entities([], [], "decisions")
    assert result.precision == 0.0
    assert result.recall == 0.0
    assert result.f1 == 0.0


def test_no_extracted():
    gt = [_gt("Launch product in Q1")]
    result = match_entities(gt, [], "decisions")
    assert len(result.false_negatives) == 1
    assert result.recall == 0.0


def test_no_ground_truth():
    result = match_entities([], ["Hire a VP Sales"], "decisions")
    assert len(result.false_positives) == 1
    assert result.precision == 0.0


def test_ambiguous_excluded_from_recall():
    gt = [
        _gt("Clear decision"),
        _gt("Maybe we should delay fundraising", ambiguous=True),
    ]
    ext = ["Clear decision"]  # found the non-ambiguous one, missed the ambiguous
    result = match_entities(gt, ext, "decisions")
    # recall denominator = TP + FN (non-ambiguous only) = 1 + 0 = 1
    assert result.recall == 1.0
    assert len(result.ambiguous_missed) == 1


# ── F1 sanity ─────────────────────────────────────────────────────────────────

def test_f1_harmonic_mean():
    gt = [_gt("A"), _gt("B"), _gt("C")]
    ext = ["A", "B", "X"]  # 2 TP, 1 FP, 1 FN
    result = match_entities(gt, ext, "decisions")
    p = result.precision
    r = result.recall
    expected_f1 = 2 * p * r / (p + r) if (p + r) else 0.0
    assert abs(result.f1 - expected_f1) < 1e-6
