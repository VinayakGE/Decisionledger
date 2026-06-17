"""CRUD read endpoints for extracted entities."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.orm import Decision, Goal, Constraint, OpenQuestion, ActionItem, ConversationSource
from app.models.schemas import (
    DecisionOut, GoalOut, ConstraintOut, OpenQuestionOut, ActionItemOut,
    ConversationSourceOut,
)

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


@router.delete("/sources/{source_id}", status_code=204)
def delete_source(source_id: int, db: Session = Depends(get_db)):
    """Delete a source and all its extracted entities (cascade)."""
    source = db.query(ConversationSource).filter(ConversationSource.id == source_id).first()
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found.")
    db.delete(source)
    db.commit()


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
