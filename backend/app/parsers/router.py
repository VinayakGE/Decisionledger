"""Route a file to the correct parser based on name + content sniffing."""
import json
from typing import List, Tuple, BinaryIO
from app.parsers.base import Conversation
from app.parsers import chatgpt, claude_export, markdown, plaintext


def detect_type(filename: str, content: bytes) -> str:
    name = filename.lower()
    if name.endswith(".md"):
        return "markdown"
    if name.endswith(".txt"):
        return "text"
    if name.endswith(".json"):
        return _sniff_json(content)
    return "text"


def _sniff_json(content: bytes) -> str:
    try:
        data = json.loads(content)
        if isinstance(data, list) and data:
            first = data[0]
            if "mapping" in first:
                return "chatgpt"
            if "chat_messages" in first or "sender" in str(first):
                return "claude"
        if isinstance(data, dict):
            if "mapping" in data:
                return "chatgpt"
            if "chat_messages" in data:
                return "claude"
    except Exception:
        pass
    return "json_unknown"


def parse_file(filename: str, file_obj: BinaryIO) -> Tuple[List[Conversation], str]:
    content = file_obj.read()
    source_type = detect_type(filename, content)

    import io
    buf = io.BytesIO(content)

    if source_type == "chatgpt":
        return chatgpt.parse(buf), source_type
    if source_type == "claude":
        return claude_export.parse(buf), source_type
    if source_type == "markdown":
        return markdown.parse(buf), source_type
    # default: plain text (also handles unknown JSON as text)
    return plaintext.parse(buf), "text"
