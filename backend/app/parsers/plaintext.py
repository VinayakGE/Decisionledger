"""Parser for plain text files.

Wraps the entire file as a single conversation with one user message.
"""

from typing import BinaryIO, List

from app.parsers.base import Conversation, Message


def parse(file_obj: BinaryIO) -> List[Conversation]:
    text = file_obj.read().decode("utf-8", errors="replace").strip()
    if not text:
        return []
    return [
        Conversation(
            title="Uploaded Document",
            messages=[Message(role="user", content=text)],
        )
    ]
