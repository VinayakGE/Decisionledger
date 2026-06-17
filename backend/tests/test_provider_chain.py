"""Tests for the provider fallback chain and insight engine resilience."""
import json
import pytest
from unittest.mock import patch, MagicMock
from app.parsers.base import Conversation, Message
from app.extractor.engine import analyse_conversation, _PROVIDERS
from app.extractor.providers.heuristic_provider import HeuristicProvider


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_conv(title="Test", text="We decided to launch at $29/month."):
    return Conversation(
        title=title,
        messages=[Message(role="user", content=text)],
    )


def _ok_result(provider_name="mock"):
    return {
        "raw": json.dumps({
            "conversation_name": "Test",
            "behavioral_pattern": "Data-driven",
            "entities": [{"type": "decision", "description": "Launch at $29/month", "confidence": 0.9}],
        }),
        "provider": provider_name,
    }


# ---------------------------------------------------------------------------
# Provider chain: first provider succeeds
# ---------------------------------------------------------------------------

def test_first_provider_wins():
    """When the first provider succeeds, no fallback is attempted."""
    mock_p1 = MagicMock()
    mock_p1.name = "first"
    mock_p1.extract.return_value = _ok_result("first")

    mock_p2 = MagicMock()
    mock_p2.name = "second"

    with patch("app.extractor.engine._PROVIDERS", [mock_p1, mock_p2]):
        result = analyse_conversation(_make_conv())

    assert result is not None
    assert result.provider_used == "first"
    mock_p2.extract.assert_not_called()


# ---------------------------------------------------------------------------
# Provider chain: first fails, second succeeds
# ---------------------------------------------------------------------------

def test_fallback_to_second_provider():
    """When primary fails, second provider is tried and its result returned."""
    mock_p1 = MagicMock()
    mock_p1.name = "anthropic"
    mock_p1.extract.side_effect = RuntimeError("no credits")

    mock_p2 = MagicMock()
    mock_p2.name = "gemini"
    mock_p2.extract.return_value = _ok_result("gemini")

    with patch("app.extractor.engine._PROVIDERS", [mock_p1, mock_p2]):
        result = analyse_conversation(_make_conv())

    assert result is not None
    assert result.provider_used == "gemini"


# ---------------------------------------------------------------------------
# Provider chain: all LLM providers fail → heuristic fallback
# ---------------------------------------------------------------------------

def test_all_llm_providers_fail_falls_to_heuristic():
    """All keyed providers fail; heuristic provider must succeed."""
    failing = MagicMock()
    failing.name = "failing_llm"
    failing.extract.side_effect = RuntimeError("network error")

    heuristic = HeuristicProvider()

    with patch("app.extractor.engine._PROVIDERS", [failing, failing, heuristic]):
        result = analyse_conversation(_make_conv())

    assert result is not None
    assert result.provider_used == "heuristic"


# ---------------------------------------------------------------------------
# Provider chain: no API key configured → provider skips cleanly
# ---------------------------------------------------------------------------

def test_no_api_key_skips_keyed_provider():
    """A provider with no API key should raise RuntimeError (not crash the process)
    and the chain should continue to the next provider."""
    from app.extractor.providers.anthropic_provider import AnthropicProvider

    with patch("app.extractor.providers.anthropic_provider.settings") as mock_settings:
        mock_settings.anthropic_api_key = ""
        provider = AnthropicProvider()
        with pytest.raises(RuntimeError, match="No Anthropic API key"):
            provider.extract(_make_conv())


def test_no_keys_chain_reaches_heuristic():
    """With no API keys configured anywhere, chain must still return a result via heuristic."""
    from app.config import settings as real_settings

    with patch.object(real_settings, "anthropic_api_key", ""), \
         patch.object(real_settings, "gemini_api_key", ""), \
         patch.object(real_settings, "cerebras_api_key", ""), \
         patch.object(real_settings, "groq_api_key", ""):
        result = analyse_conversation(_make_conv())

    assert result is not None
    assert result.provider_used == "heuristic"


# ---------------------------------------------------------------------------
# Provider chain: malformed JSON from provider → falls back
# ---------------------------------------------------------------------------

def test_malformed_json_triggers_fallback():
    """Provider returning unparseable content causes fallback to next provider."""
    bad_provider = MagicMock()
    bad_provider.name = "bad"
    bad_provider.extract.return_value = {"raw": "sorry, I cannot help", "provider": "bad"}

    good_provider = MagicMock()
    good_provider.name = "good"
    good_provider.extract.return_value = _ok_result("good")

    with patch("app.extractor.engine._PROVIDERS", [bad_provider, good_provider]):
        result = analyse_conversation(_make_conv())

    assert result is not None
    assert result.provider_used == "good"


# ---------------------------------------------------------------------------
# Provider chain: all providers fail → returns None (no crash)
# ---------------------------------------------------------------------------

def test_all_providers_fail_returns_none():
    """If every provider in the chain fails, analyse_conversation returns None."""
    failing = MagicMock()
    failing.name = "fail"
    failing.extract.side_effect = RuntimeError("total failure")

    with patch("app.extractor.engine._PROVIDERS", [failing]):
        result = analyse_conversation(_make_conv())

    assert result is None


# ---------------------------------------------------------------------------
# Provider_used is recorded in analysis output
# ---------------------------------------------------------------------------

def test_provider_used_is_recorded():
    """provider_used field is set on the returned analysis."""
    mock_p = MagicMock()
    mock_p.name = "testprovider"
    mock_p.extract.return_value = _ok_result("testprovider")

    with patch("app.extractor.engine._PROVIDERS", [mock_p]):
        result = analyse_conversation(_make_conv())

    assert result.provider_used == "testprovider"


# ---------------------------------------------------------------------------
# SentenceTransformer: _model_load_failed sentinel prevents retry
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# extract_source: provider aggregation across multiple conversations
# ---------------------------------------------------------------------------

def test_extract_source_single_provider():
    """All conversations use same provider → provider_used is that provider name."""
    from app.extractor.engine import extract_source

    mock_p = MagicMock()
    mock_p.name = "anthropic"
    mock_p.extract.return_value = _ok_result("anthropic")

    with patch("app.extractor.engine._PROVIDERS", [mock_p]):
        result = extract_source([_make_conv("c1"), _make_conv("c2")])

    assert result.provider_used == "anthropic"
    assert result.extraction_status == "completed"


def test_extract_source_mixed_providers():
    """Conversations using different providers → provider_used is 'mixed'."""
    from app.extractor.engine import extract_source

    call_count = [0]
    def side_effect(conv):
        call_count[0] += 1
        name = "anthropic" if call_count[0] == 1 else "heuristic"
        return _ok_result(name)

    mock_p = MagicMock()
    mock_p.name = "dynamic"
    mock_p.extract.side_effect = side_effect

    with patch("app.extractor.engine._PROVIDERS", [mock_p]):
        result = extract_source([_make_conv("c1"), _make_conv("c2")])

    assert result.provider_used == "mixed"
    assert result.extraction_status == "completed_with_fallback"


def test_extract_source_all_heuristic():
    """All heuristic → provider_used='heuristic', status='heuristic_fallback'."""
    from app.extractor.engine import extract_source
    from app.extractor.providers.heuristic_provider import HeuristicProvider

    heuristic = HeuristicProvider()
    failing = MagicMock()
    failing.name = "failing"
    failing.extract.side_effect = RuntimeError("no key")

    with patch("app.extractor.engine._PROVIDERS", [failing, heuristic]):
        result = extract_source([_make_conv("c1"), _make_conv("c2")])

    assert result.provider_used == "heuristic"
    assert result.extraction_status == "heuristic_fallback"


def test_extract_source_partial_failure():
    """Some conversations fail entirely → status='partial'."""
    from app.extractor.engine import extract_source

    call_count = [0]
    def side_effect(conv):
        call_count[0] += 1
        if call_count[0] == 1:
            return _ok_result("anthropic")
        raise RuntimeError("total fail")

    mock_p = MagicMock()
    mock_p.name = "mock"
    mock_p.extract.side_effect = side_effect

    with patch("app.extractor.engine._PROVIDERS", [mock_p]):
        result = extract_source([_make_conv("c1"), _make_conv("c2")])

    assert result.extraction_status == "partial"


def test_extract_source_all_fail():
    """No conversations succeed → provider_used='none', status='failed'."""
    from app.extractor.engine import extract_source

    failing = MagicMock()
    failing.name = "fail"
    failing.extract.side_effect = RuntimeError("all gone")

    with patch("app.extractor.engine._PROVIDERS", [failing]):
        result = extract_source([_make_conv("c1")])

    assert result.provider_used == "none"
    assert result.extraction_status == "failed"


def test_sentence_transformer_sentinel_prevents_retry():
    """After a failed model load, _get_model() returns None without retrying."""
    import app.insight_engine.engine as ie

    original_failed = ie._model_load_failed
    original_model = ie._model
    original_available = ie._ST_AVAILABLE

    try:
        ie._model = None
        ie._model_load_failed = False
        ie._ST_AVAILABLE = True

        with patch("app.insight_engine.engine.SentenceTransformer", side_effect=OSError("no disk")):
            result1 = ie._get_model()
            assert result1 is None
            assert ie._model_load_failed is True

            # Second call must not retry SentenceTransformer
            with patch("app.insight_engine.engine.SentenceTransformer") as mock_st:
                result2 = ie._get_model()
                assert result2 is None
                mock_st.assert_not_called()
    finally:
        ie._model_load_failed = original_failed
        ie._model = original_model
        ie._ST_AVAILABLE = original_available


def test_sentence_transformer_success_no_sentinel():
    """Successful model load does not set the failure sentinel."""
    import app.insight_engine.engine as ie

    original_failed = ie._model_load_failed
    original_model = ie._model
    original_available = ie._ST_AVAILABLE

    try:
        ie._model = None
        ie._model_load_failed = False
        ie._ST_AVAILABLE = True

        mock_instance = MagicMock()
        with patch("app.insight_engine.engine.SentenceTransformer", return_value=mock_instance):
            result = ie._get_model()

        assert result is mock_instance
        assert ie._model_load_failed is False
    finally:
        ie._model_load_failed = original_failed
        ie._model = original_model
        ie._ST_AVAILABLE = original_available
