"""Integration tests for API endpoints (in-memory SQLite, no real LLM calls)."""
import io
import json
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app

# ── in-memory DB fixture ──────────────────────────────────────────────────────

# StaticPool forces all connections to share the same in-memory SQLite instance.
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


def test_health():
    r = client.get("/health")
    assert r.status_code == 200


@patch("app.api.upload.extract_from_conversation", return_value=[
    {
        "type": "decision",
        "title": "Launch in Q1",
        "description": "We decided to launch the product in Q1.",
        "confidence": 0.9,
        "supporting_snippet": "Should we launch in Q1?",
        "linked_to": None,
        "conversation_title": "Test Conversation",
        "conversation_ts": None,
        "behavioral_pattern": "Decisive under pressure.",
        "provider_used": "mock",
    }
])
def test_upload_chatgpt(mock_extract, tmp_path, monkeypatch):
    monkeypatch.setattr("app.api.upload.settings.upload_dir", str(tmp_path))
    content = json.dumps(CHATGPT_FIXTURE).encode()
    r = client.post(
        "/upload",
        files={"file": ("conversations.json", io.BytesIO(content), "application/json")},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["source_type"] == "chatgpt"
    assert data["entities_extracted"] == 1


@patch("app.api.upload.extract_from_conversation", return_value=[])
def test_upload_markdown(mock_extract, tmp_path, monkeypatch):
    monkeypatch.setattr("app.api.upload.settings.upload_dir", str(tmp_path))
    md = b"# Strategy\n\n**User:** What should we build?\n\n**Assistant:** Build an MVP.\n"
    r = client.post(
        "/upload",
        files={"file": ("notes.md", io.BytesIO(md), "text/markdown")},
    )
    assert r.status_code == 200


def test_list_decisions_empty():
    r = client.get("/entities/decisions")
    assert r.status_code == 200
    assert r.json() == []


def test_insights_empty():
    r = client.get("/insights")
    assert r.status_code == 200
    data = r.json()
    assert data["total_decisions"] == 0
