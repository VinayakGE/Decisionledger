"""Structured conversation capture endpoints for browser-based ingestion."""

import os
import re
from datetime import timezone
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.upload import _create_pending_source, _extract_and_persist, _pending_response
from app.config import settings
from app.database import get_db
from app.models.schemas import ChatGPTCaptureIn, UploadResponse
from app.parsers.base import Conversation, Message

router = APIRouter(prefix="/capture", tags=["capture"])

_NON_ALNUM = re.compile(r"[^a-z0-9]+")
_MAX_SLUG_LENGTH = 48


def _normalize_title(title: str | None) -> str:
    cleaned = (title or "").strip()
    return cleaned or "ChatGPT Capture"


def _slugify(value: str) -> str:
    slug = _NON_ALNUM.sub("-", value.lower()).strip("-")
    return slug[:_MAX_SLUG_LENGTH] or "chatgpt-capture"


def _role_label(role: str) -> str:
    return {"user": "User", "assistant": "Assistant", "system": "System"}.get(role, "User")


def _to_conversation(payload: ChatGPTCaptureIn) -> Conversation:
    messages = [
        Message(
            role=message.role,
            content=message.content.strip(),
            timestamp=message.timestamp,
        )
        for message in payload.messages
        if message.content.strip()
    ]
    if not messages:
        raise HTTPException(
            status_code=422, detail="Capture must include at least one non-empty message."
        )

    created_at = payload.captured_at
    if created_at is None:
        created_at = next((message.timestamp for message in messages if message.timestamp), None)

    return Conversation(
        title=_normalize_title(payload.title), messages=messages, created_at=created_at
    )


def _serialize_capture_markdown(payload: ChatGPTCaptureIn, conversation: Conversation) -> str:
    lines = [f"# {conversation.title}", ""]
    if payload.source_url:
        lines.append(f"> Source: {payload.source_url}")
    if payload.captured_at:
        captured_at = payload.captured_at
        if captured_at.tzinfo is None:
            captured_at = captured_at.replace(tzinfo=timezone.utc)
        else:
            captured_at = captured_at.astimezone(timezone.utc)
        captured_at = captured_at.isoformat()
        lines.append(f"> Captured at: {captured_at}")
    if len(lines) > 2:
        lines.append("")

    for message in conversation.messages:
        lines.extend([f"**{_role_label(message.role)}:**", message.content, ""])

    return "\n".join(lines).strip() + "\n"


@router.post("/chatgpt", response_model=UploadResponse)
def capture_chatgpt_conversation(
    payload: ChatGPTCaptureIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    conversation = _to_conversation(payload)
    display_name = f"ChatGPT Capture — {conversation.title}"
    snapshot_name = f"{_slugify(conversation.title)}-{uuid4().hex[:8]}.md"
    raw_path = os.path.join(settings.upload_dir, snapshot_name)

    with open(raw_path, "w", encoding="utf-8") as file_obj:
        file_obj.write(_serialize_capture_markdown(payload, conversation))

    source = _create_pending_source(
        db,
        filename=display_name,
        source_type="chatgpt_capture",
        raw_path=raw_path,
        conversation_count=1,
    )
    background_tasks.add_task(_extract_and_persist, source.id, [conversation])
    return _pending_response(source)
