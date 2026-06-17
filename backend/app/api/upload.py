"""Upload endpoint — parse, extract, persist."""
import json
import os
import shutil
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.parsers.router import parse_file
from app.extractor.engine import extract_source
from app.extractor.persister import persist_entities
from app.models.orm import ConversationSource
from app.models.schemas import UploadResponse
from app.config import settings

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(413, f"File exceeds {settings.max_upload_size_mb} MB limit.")

    import io
    conversations, source_type = parse_file(file.filename or "upload", io.BytesIO(content))

    if not conversations:
        raise HTTPException(422, "No conversations found in the uploaded file.")

    # persist raw file
    safe_name = os.path.basename(file.filename or "upload")
    dest = os.path.join(settings.upload_dir, safe_name)
    with open(dest, "wb") as f:
        f.write(content)

    source = ConversationSource(
        filename=file.filename or "upload",
        source_type=source_type,
        raw_path=dest,
        conversation_count=len(conversations),
        extraction_status="processing",
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    result = extract_source(conversations)
    total_entities = persist_entities(db, result.entities, source.id)

    # compute average confidence from persisted entity dicts
    confidences = [e.get("confidence", 0.0) for e in result.entities if isinstance(e.get("confidence"), (int, float))]
    avg_confidence = round(sum(confidences) / len(confidences), 4) if confidences else None

    source.extraction_status = result.extraction_status
    source.provider_used = result.provider_used
    source.entities_extracted = total_entities
    source.extraction_confidence_avg = avg_confidence
    source.extraction_duration_ms = result.duration_ms
    source.fallback_chain_json = json.dumps(result.fallback_chain)
    db.commit()

    return UploadResponse(
        source_id=source.id,
        filename=source.filename,
        source_type=source.source_type,
        conversation_count=source.conversation_count,
        entities_extracted=total_entities,
        provider_used=result.provider_used,
        extraction_status=result.extraction_status,
        extraction_confidence_avg=avg_confidence,
        extraction_duration_ms=result.duration_ms,
        fallback_chain=result.fallback_chain,
    )
