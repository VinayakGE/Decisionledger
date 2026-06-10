"""Parser for Markdown files.

Treats each H1/H2 section as a separate conversation.
Speaker lines like '**User:**' or '**Assistant:**' are split into messages.
"""
import re
from typing import List, BinaryIO
from app.parsers.base import Conversation, Message

_HEADING = re.compile(r"^#{1,2}\s+(.+)$", re.MULTILINE)
_SPEAKER = re.compile(r"^\*\*(User|Human|Assistant|AI|System|You|Me)\*\*[:\s]", re.IGNORECASE | re.MULTILINE)
_ROLE_MAP = {
    "user": "user", "human": "user", "you": "user", "me": "user",
    "assistant": "assistant", "ai": "assistant",
    "system": "system",
}


def parse(file_obj: BinaryIO) -> List[Conversation]:
    text = file_obj.read().decode("utf-8", errors="replace")
    sections = _split_sections(text)

    conversations: List[Conversation] = []
    for title, body in sections:
        messages = _extract_messages(body)
        if not messages:
            # treat entire section as a single user message
            if body.strip():
                messages = [Message(role="user", content=body.strip())]
        if messages:
            conversations.append(Conversation(title=title, messages=messages))

    return conversations


def _split_sections(text: str):
    headings = list(_HEADING.finditer(text))
    if not headings:
        return [("Document", text)]

    sections = []
    for i, m in enumerate(headings):
        start = m.end()
        end = headings[i + 1].start() if i + 1 < len(headings) else len(text)
        sections.append((m.group(1).strip(), text[start:end]))
    return sections


def _extract_messages(body: str) -> List[Message]:
    parts = _SPEAKER.split(body)
    if len(parts) <= 1:
        return []

    matches = list(_SPEAKER.finditer(body))
    messages = []
    for i, m in enumerate(matches):
        raw_role = m.group(1).lower()
        role = _ROLE_MAP.get(raw_role, raw_role)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        content = body[start:end].strip()
        if content:
            messages.append(Message(role=role, content=content))
    return messages
