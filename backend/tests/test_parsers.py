"""Unit tests for file parsers."""

import io
import json

from app.parsers import chatgpt, claude_export, markdown, plaintext
from app.parsers.router import detect_type, parse_file

# ── ChatGPT ───────────────────────────────────────────────────────────────────

CHATGPT_FIXTURE = [
    {
        "title": "Test Conversation",
        "create_time": 1700000000,
        "mapping": {
            "node1": {
                "message": {
                    "author": {"role": "user"},
                    "content": {"parts": ["What should I build?"]},
                    "create_time": 1700000001,
                }
            },
            "node2": {
                "message": {
                    "author": {"role": "assistant"},
                    "content": {"parts": ["Build an MVP."]},
                    "create_time": 1700000002,
                }
            },
        },
    }
]


def test_chatgpt_parser():
    buf = io.BytesIO(json.dumps(CHATGPT_FIXTURE).encode())
    convs = chatgpt.parse(buf)
    assert len(convs) == 1
    assert convs[0].title == "Test Conversation"
    assert len(convs[0].messages) == 2
    assert convs[0].messages[0].role == "user"
    assert "What should I build?" in convs[0].messages[0].content


# ── Claude ────────────────────────────────────────────────────────────────────

CLAUDE_FIXTURE = [
    {
        "name": "Pricing strategy",
        "created_at": "2024-01-15T10:00:00Z",
        "chat_messages": [
            {
                "sender": "human",
                "text": "How should I price my SaaS?",
                "created_at": "2024-01-15T10:00:01Z",
            },
            {
                "sender": "assistant",
                "text": "Consider value-based pricing.",
                "created_at": "2024-01-15T10:00:05Z",
            },
        ],
    }
]


def test_claude_parser():
    buf = io.BytesIO(json.dumps(CLAUDE_FIXTURE).encode())
    convs = claude_export.parse(buf)
    assert len(convs) == 1
    assert convs[0].title == "Pricing strategy"
    assert convs[0].messages[0].role == "human"


# ── Markdown ──────────────────────────────────────────────────────────────────

MD_FIXTURE = """# Go-to-market strategy

**User:** Should we focus on enterprise or SMB?

**Assistant:** Start with SMB for faster feedback loops.

# Pricing discussion

**User:** What's the right price point?

**Assistant:** $99/month is a common anchor for SMB SaaS.
"""


def test_markdown_parser():
    buf = io.BytesIO(MD_FIXTURE.encode())
    convs = markdown.parse(buf)
    assert len(convs) == 2
    assert convs[0].title == "Go-to-market strategy"
    assert convs[0].messages[0].role == "user"
    assert convs[1].title == "Pricing discussion"


# ── Plain text ────────────────────────────────────────────────────────────────


def test_plaintext_parser():
    buf = io.BytesIO(b"We decided to launch in Q1.")
    convs = plaintext.parse(buf)
    assert len(convs) == 1
    assert "Q1" in convs[0].messages[0].content


# ── Router ────────────────────────────────────────────────────────────────────


def test_detect_type_markdown():
    assert detect_type("notes.md", b"") == "markdown"


def test_detect_type_chatgpt():
    content = json.dumps(CHATGPT_FIXTURE).encode()
    assert detect_type("conversations.json", content) == "chatgpt"


def test_detect_type_claude():
    content = json.dumps(CLAUDE_FIXTURE).encode()
    assert detect_type("claude.json", content) == "claude"


def test_parse_file_markdown():
    buf = io.BytesIO(MD_FIXTURE.encode())
    convs, src_type = parse_file("notes.md", buf)
    assert src_type == "markdown"
    assert len(convs) == 2
