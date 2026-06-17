"""Pydantic schemas for API I/O."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.orm import GoalStatus, ActionStatus


# ── Upload ────────────────────────────────────────────────────────────────────

class FallbackStep(BaseModel):
    provider: str
    status: str
    error: Optional[str] = None


class UploadResponse(BaseModel):
    source_id: int
    filename: str
    source_type: str
    conversation_count: int
    entities_extracted: int
    provider_used: Optional[str] = None
    extraction_status: Optional[str] = None
    extraction_confidence_avg: Optional[float] = None
    extraction_duration_ms: Optional[int] = None
    fallback_chain: List[FallbackStep] = []


# ── Reason / Evidence (nested) ────────────────────────────────────────────────

class ReasonOut(BaseModel):
    id: int
    description: str
    confidence: float

    class Config:
        from_attributes = True


class EvidenceOut(BaseModel):
    id: int
    description: str
    source_reference: Optional[str]

    class Config:
        from_attributes = True


# ── Decision ──────────────────────────────────────────────────────────────────

class DecisionOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    timestamp: Optional[datetime]
    confidence: float
    source_reference: Optional[str]
    supporting_snippet: Optional[str]
    source_id: Optional[int]
    reasons: List[ReasonOut] = []
    evidence: List[EvidenceOut] = []

    class Config:
        from_attributes = True


# ── Goal ──────────────────────────────────────────────────────────────────────

class GoalOut(BaseModel):
    id: int
    description: str
    status: GoalStatus
    confidence: float
    source_reference: Optional[str]
    supporting_snippet: Optional[str]
    timestamp: Optional[datetime]
    frequency: int

    class Config:
        from_attributes = True


# ── Constraint ────────────────────────────────────────────────────────────────

class ConstraintOut(BaseModel):
    id: int
    description: str
    confidence: float
    source_reference: Optional[str]
    supporting_snippet: Optional[str]

    class Config:
        from_attributes = True


# ── OpenQuestion ──────────────────────────────────────────────────────────────

class OpenQuestionOut(BaseModel):
    id: int
    description: str
    confidence: float
    source_reference: Optional[str]
    supporting_snippet: Optional[str]

    class Config:
        from_attributes = True


# ── ActionItem ────────────────────────────────────────────────────────────────

class ActionItemOut(BaseModel):
    id: int
    description: str
    status: ActionStatus
    confidence: float
    source_reference: Optional[str]
    supporting_snippet: Optional[str]

    class Config:
        from_attributes = True


# ── ConversationSource ────────────────────────────────────────────────────────

class ConversationSourceOut(BaseModel):
    id: int
    filename: str
    source_type: str
    uploaded_at: datetime
    conversation_count: int
    extraction_status: Optional[str] = None
    provider_used: Optional[str] = None
    entities_extracted: Optional[int] = None
    extraction_confidence_avg: Optional[float] = None
    extraction_duration_ms: Optional[int] = None

    class Config:
        from_attributes = True


# ── Insights ──────────────────────────────────────────────────────────────────

class RecurringQuestionGroup(BaseModel):
    representative: str
    occurrences: List[str]
    count: int


class DecisionReversal(BaseModel):
    original: DecisionOut
    reversal: DecisionOut
    similarity: float


class UnresolvedDiscussion(BaseModel):
    topic: str
    source_reference: Optional[str]
    open_questions: List[str]


class BlindSpot(BaseModel):
    topic: str
    discussion_count: int
    action_count: int
    ratio: float  # actions / discussions — lower means more blind spot


class InsightReport(BaseModel):
    recurring_questions: List[RecurringQuestionGroup]
    decision_reversals: List[DecisionReversal]
    top_goals: List[GoalOut]
    blind_spots: List[BlindSpot]
    total_decisions: int
    total_open_questions: int
    total_action_items: int
