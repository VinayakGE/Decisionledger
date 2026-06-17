"""Tests for entity extraction helpers (no API calls)."""

import pytest

from app.extractor.engine import _parse_response
from app.extractor.persister import _clamp, _resolve_link


def test_parse_response_valid_json():
    raw = '{"conversation_name": "Test", "behavioral_pattern": "Cautious", "entities": [{"type": "goal", "description": "Launch MVP"}]}'
    result = _parse_response(raw)
    assert result["entities"][0]["type"] == "goal"
    assert result["behavioral_pattern"] == "Cautious"


def test_parse_response_fenced():
    raw = '```json\n{"conversation_name": "X", "behavioral_pattern": "B", "entities": []}\n```'
    result = _parse_response(raw)
    assert result == {"conversation_name": "X", "behavioral_pattern": "B", "entities": []}


def test_parse_response_garbage():
    result = _parse_response("sorry, I cannot help with that")
    assert result is None


def test_provider_truncate():
    from app.extractor.providers.anthropic_provider import AnthropicProvider

    provider = AnthropicProvider()
    text = "a" * 200
    truncated = provider._truncate(text, 100)
    assert len(truncated) < 200
    assert "truncated" in truncated


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
