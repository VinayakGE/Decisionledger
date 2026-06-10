"""Parser for ChatGPT exported conversations.json."""
import json
from datetime import datetime, timezone
from typing import List, BinaryIO
from app.parsers.base import Conversation, Message


def parse(file_obj: BinaryIO) -> List[Conversation]:
    data = json.load(file_obj)
    # ChatGPT export is a list of conversation objects
    if not isinstance(data, list):
        data = [data]

    conversations: List[Conversation] = []
    for item in data:
        title = item.get("title") or "Untitled"
        created_ts = item.get("create_time")
        created_at = _from_unix(created_ts)

        messages: List[Message] = []
        mapping = item.get("mapping", {})
        # mapping values are nodes; follow the linked list via "next" / "parent"
        # Simpler: collect all messages sorted by create_time
        nodes = list(mapping.values())
        nodes.sort(key=lambda n: n.get("message", {}).get("create_time") or 0)

        for node in nodes:
            msg = node.get("message")
            if not msg:
                continue
            author = msg.get("author", {}).get("role", "unknown")
            content_obj = msg.get("content", {})
            if isinstance(content_obj, dict):
                parts = content_obj.get("parts", [])
                text = " ".join(p for p in parts if isinstance(p, str))
            elif isinstance(content_obj, str):
                text = content_obj
            else:
                continue
            if not text.strip():
                continue
            ts = _from_unix(msg.get("create_time"))
            messages.append(Message(role=author, content=text.strip(), timestamp=ts))

        if messages:
            conversations.append(Conversation(title=title, messages=messages, created_at=created_at))

    return conversations


def _from_unix(ts) -> datetime | None:
    if ts is None:
        return None
    try:
        return datetime.fromtimestamp(float(ts), tz=timezone.utc)
    except Exception:
        return None
