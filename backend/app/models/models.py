import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


def generate_uuid():
    return str(uuid.uuid4())


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=False, unique=True)
    dimension_code = Column(String, nullable=False)
    dimension_name = Column(String, nullable=False)
    round_number = Column(Integer, nullable=False)
    intensity = Column(String, nullable=False)
    question_text = Column(Text, nullable=False)
    rationale = Column(Text, nullable=False)
    version = Column(String, default="1.0")


class EvaluationSession(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    model_name = Column(String, nullable=False)
    model_version = Column(String, nullable=True)
    model_provider = Column(String, nullable=True)
    evaluator_name = Column(String, nullable=False)
    evaluator_credentials = Column(String, nullable=True)
    conflict_disclosure = Column(String, nullable=True)
    transcript_url = Column(String, nullable=True)
    status = Column(String, default="in_progress")
    current_question = Column(Integer, default=1)
    global_notes = Column(Text, nullable=True)
    benchmark_version = Column(String, default="1.0")
    kampff_index = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    completed_at = Column(DateTime, nullable=True)

    responses = relationship(
        "QuestionResponse", back_populates="session", cascade="all, delete-orphan"
    )


class QuestionResponse(Base):
    __tablename__ = "responses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    question_as_delivered = Column(Text, nullable=True)
    model_response = Column(Text, nullable=True)
    response_latency_seconds = Column(Float, nullable=True)
    score = Column(Integer, nullable=True)
    evaluator_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    session = relationship("EvaluationSession", back_populates="responses")
    question = relationship("Question")

    __table_args__ = (
        UniqueConstraint("session_id", "question_id", name="uq_session_question"),
        CheckConstraint("score >= 1 AND score <= 10", name="ck_score_range"),
    )
