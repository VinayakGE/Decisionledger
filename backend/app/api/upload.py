"""Upload endpoint — parse synchronously, extract asynchronously."""

import json
import logging
import os

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal, get_db
from app.extractor.engine import extract_source
from app.extractor.persister import persist_entities
from app.models.orm import ConversationSource
from app.models.schemas import UploadResponse
from app.parsers.router import parse_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("", response_model=UploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(413, f"File exceeds {settings.max_upload_size_mb} MB limit.")

    import io

    try:
        conversations, source_type = parse_file(file.filename or "upload", io.BytesIO(content))
    except ValueError as exc:
        raise HTTPException(422, str(exc))

    if not conversations:
        raise HTTPException(422, "No conversations found in the uploaded file.")

    safe_name = os.path.basename(file.filename or "upload")
    dest = os.path.join(settings.upload_dir, safe_name)
    with open(dest, "wb") as f:
        f.write(content)

    source = ConversationSource(
        filename=file.filename or "upload",
        source_type=source_type,
        raw_path=dest,
        conversation_count=len(conversations),
        extraction_status="pending",
        entities_extracted=0,
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    background_tasks.add_task(_extract_and_persist, source.id, conversations)

    return UploadResponse(
        source_id=source.id,
        filename=source.filename,
        source_type=source.source_type,
        conversation_count=source.conversation_count,
        entities_extracted=0,
        extraction_status="pending",
    )


def _extract_and_persist(source_id: int, conversations: list) -> None:
    """Background task: run extraction and persist results.

    Opens its own DB session (the request session is closed by the time this
    runs). Updates the source record on completion or failure.
    """
    db = SessionLocal()
    try:
        source = db.query(ConversationSource).filter_by(id=source_id).first()
        if source is None:
            logger.error("Background extraction: source %d not found.", source_id)
            return

        result = extract_source(conversations)
        total_entities = persist_entities(db, result.entities, source_id)

        confidences = [
            e.get("confidence", 0.0)
            for e in result.entities
            if isinstance(e.get("confidence"), (int, float))
        ]
        avg_confidence = round(sum(confidences) / len(confidences), 4) if confidences else None

        source.extraction_status = result.extraction_status
        source.provider_used = result.provider_used
        source.entities_extracted = total_entities
        source.extraction_confidence_avg = avg_confidence
        source.extraction_duration_ms = result.duration_ms
        source.fallback_chain_json = json.dumps(result.fallback_chain)
        db.commit()
        logger.info(
            "Extraction complete for source %d: %d entities, provider=%s, status=%s",
            source_id,
            total_entities,
            result.provider_used,
            result.extraction_status,
        )
    except Exception as e:
        logger.error("Extraction failed for source %d: %s", source_id, e, exc_info=True)
        try:
            source = db.query(ConversationSource).filter_by(id=source_id).first()
            if source:
                source.extraction_status = "failed"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
