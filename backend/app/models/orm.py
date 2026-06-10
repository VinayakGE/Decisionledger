"""SQLAlchemy ORM models."""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime,
    ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class GoalStatus(str, enum.Enum):
    open = "open"
    achieved = "achieved"
    abandoned = "abandoned"
    unknown = "unknown"


class ActionStatus(str, enum.Enum):
    pending = "pending"
    done = "done"
    cancelled = "cancelled"
    unknown = "unknown"


class ConversationSource(Base):
    __tablename__ = "conversation_sources"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    source_type = Column(String, nullable=False)  # chatgpt | claude | markdown | text
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    raw_path = Column(String)  # path to stored upload
    conversation_count = Column(Integer, default=0)

    decisions = relationship("Decision", back_populates="source")
    goals = relationship("Goal", back_populates="source")
    constraints = relationship("Constraint", back_populates="source")
    open_questions = relationship("OpenQuestion", back_populates="source")
    action_items = relationship("ActionItem", back_populates="source")


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    timestamp = Column(DateTime, nullable=True)
    confidence = Column(Float, default=0.0)  # 0.0–1.0
    source_reference = Column(String)  # conversation title / message id
    supporting_snippet = Column(Text)
    source_id = Column(Integer, ForeignKey("conversation_sources.id"))

    source = relationship("ConversationSource", back_populates="decisions")
    reasons = relationship("Reason", back_populates="decision", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="decision", cascade="all, delete-orphan")


class Reason(Base):
    __tablename__ = "reasons"

    id = Column(Integer, primary_key=True, index=True)
    linked_decision_id = Column(Integer, ForeignKey("decisions.id"))
    description = Column(Text)
    confidence = Column(Float, default=0.0)

    decision = relationship("Decision", back_populates="reasons")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    linked_decision_id = Column(Integer, ForeignKey("decisions.id"))
    description = Column(Text)
    source_reference = Column(String)

    decision = relationship("Decision", back_populates="evidence")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(Text, nullable=False)
    status = Column(SAEnum(GoalStatus), default=GoalStatus.unknown)
    confidence = Column(Float, default=0.0)
    source_reference = Column(String)
    supporting_snippet = Column(Text)
    timestamp = Column(DateTime, nullable=True)
    source_id = Column(Integer, ForeignKey("conversation_sources.id"))
    frequency = Column(Integer, default=1)

    source = relationship("ConversationSource", back_populates="goals")


class Constraint(Base):
    __tablename__ = "constraints"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(Text, nullable=False)
    confidence = Column(Float, default=0.0)
    source_reference = Column(String)
    supporting_snippet = Column(Text)
    timestamp = Column(DateTime, nullable=True)
    source_id = Column(Integer, ForeignKey("conversation_sources.id"))

    source = relationship("ConversationSource", back_populates="constraints")


class OpenQuestion(Base):
    __tablename__ = "open_questions"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(Text, nullable=False)
    confidence = Column(Float, default=0.0)
    source_reference = Column(String)
    supporting_snippet = Column(Text)
    timestamp = Column(DateTime, nullable=True)
    source_id = Column(Integer, ForeignKey("conversation_sources.id"))

    source = relationship("ConversationSource", back_populates="open_questions")


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(Text, nullable=False)
    status = Column(SAEnum(ActionStatus), default=ActionStatus.unknown)
    confidence = Column(Float, default=0.0)
    source_reference = Column(String)
    supporting_snippet = Column(Text)
    timestamp = Column(DateTime, nullable=True)
    source_id = Column(Integer, ForeignKey("conversation_sources.id"))

    source = relationship("ConversationSource", back_populates="action_items")
