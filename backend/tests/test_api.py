"""Integration tests for API endpoints (in-memory SQLite, no real LLM calls)."""
import io
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app

# ── in-memory DB fixture ──────────────────────────────────────────────────────

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    from app.models import orm  # noqa
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

CHATGPT_FIXTURE = [
    {
        "title": "Test Conversation",
        "create_time": 1700000000,
        "mapping": {
            "node1": {
                "message": {
                    "author": {"role": "user"},
                    "content": {"parts": ["Should we launch in Q1?"]},
                    "create_time": 1700000001,
                }
            },
        },
    }
]


def _mock_extraction_result(entities=None):
    from app.extractor.engine import ExtractionResult
    return ExtractionResult(
        entities=entities or [],
        provider_used="mock",
        extraction_status="completed",
        fallback_chain=[{"provider": "mock", "status": "success"}],
        duration_ms=42,
    )


# ── Upload: async behaviour ───────────────────────────────────────────────────

def test_upload_returns_pending_immediately(tmp_path, monkeypatch):
    """Upload responds immediately with status='pending' — extraction runs in background."""
    monkeypatch.setattr("app.api.upload.settings.upload_dir", str(tmp_path))
    content = json.dumps(CHATGPT_FIXTURE).encode()
    r = client.post(
        "/upload",
        files={"file": ("conversations.json", io.BytesIO(content), "application/json")},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["source_type"] == "chatgpt"
    assert data["extraction_status"] == "pending"
    assert data["entities_extracted"] == 0
    assert data["provider_used"] is None


def test_upload_chatgpt(tmp_path, monkeypatch):
    """Upload commits source and schedules background extraction."""
    monkeypatch.setattr("app.api.upload.settings.upload_dir", str(tmp_path))
    content = json.dumps(CHATGPT_FIXTURE).encode()
    r = client.post(
        "/upload",
        files={"file": ("conversations.json", io.BytesIO(content), "application/json")},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["source_type"] == "chatgpt"
    assert data["source_id"] is not None


def test_upload_markdown(tmp_path, monkeypatch):
    """Markdown upload returns pending status."""
    monkeypatch.setattr("app.api.upload.settings.upload_dir", str(tmp_path))
    md = b"# Strategy\n\n**User:** What should we build?\n\n**Assistant:** Build an MVP.\n"
    r = client.post(
        "/upload",
        files={"file": ("notes.md", io.BytesIO(md), "text/markdown")},
    )
    assert r.status_code == 200
    assert r.json()["extraction_status"] == "pending"


# ── Background extraction task ────────────────────────────────────────────────

def test_extract_and_persist_background_task(tmp_path, monkeypatch):
    """Background task runs extraction and updates source status to completed."""
    monkeypatch.setattr("app.api.upload.settings.upload_dir", str(tmp_path))
    from app.api.upload import _extract_and_persist
    from app.models.orm import ConversationSource
    from app.parsers.base import Conversation, Message

    db = TestSessionLocal()
    source = ConversationSource(
        filename="test.md", source_type="markdown",
        extraction_status="pending", entities_extracted=0,
    )
    db.add(source)
    db.commit()
    source_id = source.id
    db.close()

    conversations = [Conversation(
        title="Test",
        messages=[Message(role="user", content="We decided to launch at $29/month.")],
    )]

    with patch("app.api.upload.extract_source") as mock_extract, \
         patch("app.api.upload.SessionLocal", TestSessionLocal):
        mock_extract.return_value = _mock_extraction_result(entities=[{
            "type": "decision", "title": "Launch at $29", "description": "Launch at $29/month.",
            "confidence": 0.9, "supporting_snippet": "launch at $29/month",
            "linked_to": None, "conversation_title": "Test",
            "conversation_ts": None, "behavioral_pattern": "Data-driven", "provider_used": "mock",
        }])
        _extract_and_persist(source_id, conversations)

    db = TestSessionLocal()
    updated = db.query(ConversationSource).filter_by(id=source_id).first()
    assert updated.extraction_status == "completed"
    assert updated.provider_used == "mock"
    assert updated.extraction_duration_ms == 42
    db.close()


def test_extract_and_persist_handles_failure(tmp_path, monkeypatch):
    """Background task marks source as 'failed' on extraction error."""
    from app.api.upload import _extract_and_persist
    from app.models.orm import ConversationSource

    db = TestSessionLocal()
    source = ConversationSource(
        filename="crash.md", source_type="markdown",
        extraction_status="pending", entities_extracted=0,
    )
    db.add(source)
    db.commit()
    source_id = source.id
    db.close()

    with patch("app.api.upload.extract_source", side_effect=RuntimeError("boom")), \
         patch("app.api.upload.SessionLocal", TestSessionLocal):
        _extract_and_persist(source_id, [])

    db = TestSessionLocal()
    updated = db.query(ConversationSource).filter_by(id=source_id).first()
    assert updated.extraction_status == "failed"
    db.close()


# ── Polling endpoint ──────────────────────────────────────────────────────────

def test_get_source_status(tmp_path, monkeypatch):
    """GET /entities/sources/{id} returns current source state for polling."""
    from app.models.orm import ConversationSource
    db = TestSessionLocal()
    source = ConversationSource(
        filename="poll.md", source_type="markdown",
        extraction_status="completed", entities_extracted=5,
        provider_used="anthropic",
    )
    db.add(source)
    db.commit()
    source_id = source.id
    db.close()

    r = client.get(f"/entities/sources/{source_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["extraction_status"] == "completed"
    assert data["entities_extracted"] == 5
    assert data["provider_used"] == "anthropic"


def test_get_source_status_404():
    r = client.get("/entities/sources/99999")
    assert r.status_code == 404


# ── Startup recovery ──────────────────────────────────────────────────────────

def test_stuck_pending_reset_on_startup():
    """_reset_stuck_pending_sources() marks pending sources as failed."""
    from app.models.orm import ConversationSource
    from app.database import _reset_stuck_pending_sources

    db = TestSessionLocal()
    stuck = ConversationSource(
        filename="stuck.md", source_type="markdown", extraction_status="pending",
    )
    done = ConversationSource(
        filename="done.md", source_type="markdown", extraction_status="completed",
    )
    db.add_all([stuck, done])
    db.commit()
    stuck_id, done_id = stuck.id, done.id
    db.close()

    with patch("app.database.SessionLocal", TestSessionLocal):
        _reset_stuck_pending_sources()

    db = TestSessionLocal()
    assert db.query(ConversationSource).get(stuck_id).extraction_status == "failed"
    assert db.query(ConversationSource).get(done_id).extraction_status == "completed"
    db.close()


# ── Other entity endpoints ────────────────────────────────────────────────────

def test_list_decisions_empty():
    r = client.get("/entities/decisions")
    assert r.status_code == 200
    assert r.json() == []


def test_insights_empty():
    r = client.get("/insights")
    assert r.status_code == 200
    assert r.json()["total_decisions"] == 0


# ── Delete source ─────────────────────────────────────────────────────────────

def test_delete_source():
    """DELETE /entities/sources/{id} removes source and returns 204."""
    from app.models.orm import ConversationSource
    db = TestSessionLocal()
    source = ConversationSource(
        filename="todelete.md", source_type="markdown",
        extraction_status="completed", entities_extracted=0,
    )
    db.add(source)
    db.commit()
    source_id = source.id
    db.close()

    r = client.delete(f"/entities/sources/{source_id}")
    assert r.status_code == 204

    # Confirm gone
    r2 = client.get(f"/entities/sources/{source_id}")
    assert r2.status_code == 404


def test_delete_source_cascades_entities():
    """Deleting a source removes all associated decisions."""
    from app.models.orm import ConversationSource, Decision
    db = TestSessionLocal()
    source = ConversationSource(
        filename="cascade.md", source_type="markdown",
        extraction_status="completed", entities_extracted=1,
    )
    db.add(source)
    db.flush()
    decision = Decision(
        title="Launch at $29", description="desc", confidence=0.9, source_id=source.id,
    )
    db.add(decision)
    db.commit()
    source_id = source.id
    decision_id = decision.id
    db.close()

    r = client.delete(f"/entities/sources/{source_id}")
    assert r.status_code == 204

    db = TestSessionLocal()
    assert db.query(Decision).filter_by(id=decision_id).first() is None
    db.close()


def test_delete_source_404():
    r = client.delete("/entities/sources/99999")
    assert r.status_code == 404


def test_delete_source_removes_raw_file(tmp_path):
    """Deleting a source removes the raw uploaded file from disk."""
    from app.models.orm import ConversationSource

    raw_file = tmp_path / "upload.md"
    raw_file.write_text("# Test content")

    db = TestSessionLocal()
    source = ConversationSource(
        filename="upload.md", source_type="markdown",
        extraction_status="completed", entities_extracted=0,
        raw_path=str(raw_file),
    )
    db.add(source)
    db.commit()
    source_id = source.id
    db.close()

    assert raw_file.exists()
    r = client.delete(f"/entities/sources/{source_id}")
    assert r.status_code == 204
    assert not raw_file.exists()


def test_delete_source_tolerates_missing_file(tmp_path):
    """Delete succeeds even if the raw file is already gone from disk."""
    from app.models.orm import ConversationSource

    db = TestSessionLocal()
    source = ConversationSource(
        filename="gone.md", source_type="markdown",
        extraction_status="completed", entities_extracted=0,
        raw_path=str(tmp_path / "already_deleted.md"),
    )
    db.add(source)
    db.commit()
    source_id = source.id
    db.close()

    r = client.delete(f"/entities/sources/{source_id}")
    assert r.status_code == 204
