"""Route a file to the correct parser based on name + content sniffing."""

import io
import json
import zipfile
from typing import BinaryIO, List, Tuple

from app.parsers import chatgpt, claude_export, markdown, plaintext
from app.parsers.base import Conversation

# Preferred JSON filenames inside a zip export (in priority order)
_ZIP_JSON_CANDIDATES = ["conversations.json", "chat.json", "export.json"]


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


def _parse_zip(content: bytes) -> Tuple[List[Conversation], str]:
    """Extract conversations from a zip export archive.

    Looks for a known JSON file inside the zip (conversations.json first),
    sniffs its format, and delegates to the appropriate parser.
    Raises ValueError if no usable JSON is found.
    """
    with zipfile.ZipFile(io.BytesIO(content)) as zf:
        names_lower = {n.lower(): n for n in zf.namelist()}

        # Try preferred candidate names first
        chosen = None
        for candidate in _ZIP_JSON_CANDIDATES:
            if candidate in names_lower:
                chosen = names_lower[candidate]
                break

        # Fall back to any .json file in the archive
        if chosen is None:
            json_files = [n for n in zf.namelist() if n.lower().endswith(".json")]
            if json_files:
                chosen = json_files[0]

        if chosen is None:
            raise ValueError(
                "No JSON file found inside the zip. "
                "Expected conversations.json (ChatGPT or Claude data export)."
            )

        json_bytes = zf.read(chosen)

    source_type = _sniff_json(json_bytes)
    buf = io.BytesIO(json_bytes)

    if source_type == "chatgpt":
        return chatgpt.parse(buf), source_type
    if source_type == "claude":
        return claude_export.parse(buf), source_type
    # Unknown JSON inside zip — try as text
    return plaintext.parse(io.BytesIO(json_bytes)), "text"


def parse_file(filename: str, file_obj: BinaryIO) -> Tuple[List[Conversation], str]:
    content = file_obj.read()

    if filename.lower().endswith(".zip"):
        return _parse_zip(content)

    source_type = detect_type(filename, content)
    buf = io.BytesIO(content)

    if source_type == "chatgpt":
        return chatgpt.parse(buf), source_type
    if source_type == "claude":
        return claude_export.parse(buf), source_type
    if source_type == "markdown":
        return markdown.parse(buf), source_type
    # default: plain text (also handles unknown JSON as text)
    return plaintext.parse(buf), "text"
