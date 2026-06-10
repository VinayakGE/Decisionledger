"""Tests for entity extraction helpers (no API calls)."""
import pytest
from app.extractor.engine import _safe_parse, _chunk_text
from app.extractor.persister import _clamp, _resolve_link


def test_safe_parse_valid_json():
    raw = '{"entities": [{"type": "goal", "description": "Launch MVP"}]}'
    result = _safe_parse(raw)
    assert result["entities"][0]["type"] == "goal"


def test_safe_parse_fenced():
    raw = "```json\n{\"entities\": []}\n```"
    result = _safe_parse(raw)
    assert result == {"entities": []}


def test_safe_parse_garbage():
    result = _safe_parse("sorry, I cannot help with that")
    assert result == {"entities": []}


def test_chunk_text_short():
    text = "hello world"
    chunks = _chunk_text(text, 100)
    assert chunks == [text]


def test_chunk_text_splits():
    text = "a" * 250
    chunks = _chunk_text(text, 100)
    assert len(chunks) == 3


def test_clamp():
    assert _clamp(1.5) == 1.0
    assert _clamp(-0.1) == 0.0
    assert _clamp(0.7) == pytest.approx(0.7)
    assert _clamp("bad") == 0.0


def test_resolve_link_exact():
    decision_map = {"launch strategy": 42}
    e = {"linked_to": "Launch Strategy", "type": "reason"}
    assert _resolve_link(e, decision_map) == 42


def test_resolve_link_miss():
    decision_map = {"launch strategy": 42}
    e = {"linked_to": "pricing model"}
    assert _resolve_link(e, decision_map) is None
