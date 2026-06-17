"""CRUD read endpoints for extracted entities."""

import io
import json
import logging
import os
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.extractor.engine import extract_source
from app.extractor.persister import persist_entities
from app.models.orm import (
    ActionItem,
    Constraint,
    ConversationSource,
    Decision,
    Evidence,
    Goal,
    OpenQuestion,
    Reason,
)
from app.models.schemas import (
    ActionItemOut,
    ConstraintOut,
    ConversationSourceOut,
    DecisionOut,
    GoalOut,
    OpenQuestionOut,
)
from app.parsers.router import parse_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/entities", tags=["entities"])


@router.get("/sources", response_model=List[ConversationSourceOut])
def list_sources(db: Session = Depends(get_db)):
    return db.query(ConversationSource).order_by(ConversationSource.uploaded_at.desc()).all()


@router.get("/sources/{source_id}", response_model=ConversationSourceOut)
def get_source(source_id: int, db: Session = Depends(get_db)):
    """Poll extraction status for a specific source after upload."""
    source = db.query(ConversationSource).filter(ConversationSource.id == source_id).first()
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found.")
    return source


@router.post("/sources/{source_id}/reanalyze", response_model=ConversationSourceOut)
def reanalyze_source(
    source_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Wipe existing entities for a source and re-run extraction in the background."""
    source = db.query(ConversationSource).filter(ConversationSource.id == source_id).first()
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found.")

    if not source.raw_path or not os.path.exists(source.raw_path):
        raise HTTPException(
            status_code=409,
            detail="Raw file not found on disk — cannot re-analyze. Please re-upload the file.",
        )

    # Wipe all existing entities for this source.
    # Evidence and Reason link to Decision (not directly to source), so delete those first.
    decision_ids = [
        row[0] for row in db.query(Decision.id).filter(Decision.source_id == source_id).all()
    ]
    if decision_ids:
        db.query(Evidence).filter(Evidence.linked_decision_id.in_(decision_ids)).delete(synchronize_session=False)
        db.query(Reason).filter(Reason.linked_decision_id.in_(decision_ids)).delete(synchronize_session=False)
    for model in (Decision, Goal, Constraint, OpenQuestion, ActionItem):
        db.query(model).filter(model.source_id == source_id).delete(synchronize_session=False)

    source.extraction_status = "pending"
    source.entities_extracted = 0
    source.provider_used = None
    source.extraction_confidence_avg = None
    source.extraction_duration_ms = None
    source.fallback_chain_json = None
    db.commit()
    db.refresh(source)

    # Re-parse the raw file and schedule background extraction
    filename = os.path.basename(source.raw_path)
    with open(source.raw_path, "rb") as f:
        content = f.read()
    try:
        conversations, _ = parse_file(filename, io.BytesIO(content))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Failed to re-parse file: {exc}")

    background_tasks.add_task(_reextract_and_persist, source_id, conversations)
    return source


def _reextract_and_persist(source_id: int, conversations: list) -> None:
    """Background task for re-extraction (same logic as initial upload)."""
    db = SessionLocal()
    try:
        source = db.query(ConversationSource).filter_by(id=source_id).first()
        if source is None:
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
            "Re-extraction complete for source %d: %d entities, provider=%s, status=%s",
            source_id, total_entities, result.provider_used, result.extraction_status,
        )
    except Exception as e:
        logger.error("Re-extraction failed for source %d: %s", source_id, e, exc_info=True)
        try:
            source = db.query(ConversationSource).filter_by(id=source_id).first()
            if source:
                source.extraction_status = "failed"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.delete("/sources/{source_id}", status_code=204)
def delete_source(source_id: int, db: Session = Depends(get_db)):
    """Delete a source, all its extracted entities (cascade), and the raw uploaded file."""
    source = db.query(ConversationSource).filter(ConversationSource.id == source_id).first()
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found.")
    raw_path = source.raw_path
    db.delete(source)
    db.commit()
    if raw_path and os.path.exists(raw_path):
        try:
            os.remove(raw_path)
            logger.info("Deleted raw file: %s", raw_path)
        except OSError as e:
            logger.warning("Could not delete raw file %s: %s", raw_path, e)


@router.get("/decisions", response_model=List[DecisionOut])
def list_decisions(
    source_id: Optional[int] = Query(None),
    min_confidence: float = Query(0.0),
    db: Session = Depends(get_db),
):
    q = db.query(Decision)
    if source_id is not None:
        q = q.filter(Decision.source_id == source_id)
    q = q.filter(Decision.confidence >= min_confidence)
    return q.order_by(Decision.confidence.desc()).all()


@router.get("/goals", response_model=List[GoalOut])
def list_goals(
    source_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Goal)
    if source_id is not None:
        q = q.filter(Goal.source_id == source_id)
    return q.order_by(Goal.frequency.desc(), Goal.confidence.desc()).all()


@router.get("/constraints", response_model=List[ConstraintOut])
def list_constraints(
    source_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Constraint)
    if source_id is not None:
        q = q.filter(Constraint.source_id == source_id)
    return q.order_by(Constraint.confidence.desc()).all()


@router.get("/open-questions", response_model=List[OpenQuestionOut])
def list_open_questions(
    source_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(OpenQuestion)
    if source_id is not None:
        q = q.filter(OpenQuestion.source_id == source_id)
    return q.order_by(OpenQuestion.confidence.desc()).all()


@router.get("/action-items", response_model=List[ActionItemOut])
def list_action_items(
    source_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(ActionItem)
    if source_id is not None:
        q = q.filter(ActionItem.source_id == source_id)
    return q.order_by(ActionItem.confidence.desc()).all()
