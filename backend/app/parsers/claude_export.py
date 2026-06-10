"""Parser for Claude exported conversations (JSON format)."""
import json
from datetime import datetime, timezone
from typing import List, BinaryIO
from app.parsers.base import Conversation, Message
from dateutil import parser as dateutil_parser


def parse(file_obj: BinaryIO) -> List[Conversation]:
    data = json.load(file_obj)
    if not isinstance(data, list):
        data = [data]

    conversations: List[Conversation] = []
    for item in data:
        title = item.get("name") or item.get("title") or "Untitled"
        created_raw = item.get("created_at")
        created_at = _parse_dt(created_raw)

        messages: List[Message] = []
        for turn in item.get("chat_messages", []):
            role = turn.get("sender") or turn.get("role") or "unknown"
            # content may be a string or list of content blocks
            raw_content = turn.get("text") or turn.get("content") or ""
            if isinstance(raw_content, list):
                text = " ".join(
                    block.get("text", "") for block in raw_content
                    if isinstance(block, dict) and block.get("type") == "text"
                )
            else:
                text = str(raw_content)
            if not text.strip():
                continue
            ts = _parse_dt(turn.get("created_at"))
            messages.append(Message(role=role, content=text.strip(), timestamp=ts))

        if messages:
            conversations.append(Conversation(title=title, messages=messages, created_at=created_at))

    return conversations


def _parse_dt(raw) -> datetime | None:
    if not raw:
        return None
    try:
        return dateutil_parser.parse(str(raw))
    except Exception:
        return None
