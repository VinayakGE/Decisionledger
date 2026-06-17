"""Shared types for all parsers."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


@dataclass
class Message:
    role: str  # user | assistant | system
    content: str
    timestamp: Optional[datetime] = None


@dataclass
class Conversation:
    title: str
    messages: List[Message] = field(default_factory=list)
    created_at: Optional[datetime] = None

    def full_text(self) -> str:
        parts = []
        for m in self.messages:
            ts = f" [{m.timestamp.isoformat()}]" if m.timestamp else ""
            parts.append(f"{m.role.upper()}{ts}:\n{m.content}")
        return "\n\n---\n\n".join(parts)
