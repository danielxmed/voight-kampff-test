from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# --- Question Schemas ---


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    dimension_code: str
    dimension_name: str
    round_number: int
    intensity: str
    question_text: str
    rationale: str
    version: str


class QuestionListOut(BaseModel):
    questions: list[QuestionOut]
    total: int


# --- Session Schemas ---


class SessionCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_name: str
    model_version: Optional[str] = None
    model_provider: Optional[str] = None
    evaluator_name: str
    evaluator_credentials: Optional[str] = None
    conflict_disclosure: Optional[str] = None
    transcript_url: Optional[str] = None


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: str
    model_name: str
    model_version: Optional[str] = None
    model_provider: Optional[str] = None
    evaluator_name: str
    evaluator_credentials: Optional[str] = None
    conflict_disclosure: Optional[str] = None
    transcript_url: Optional[str] = None
    status: str
    current_question: int
    global_notes: Optional[str] = None
    benchmark_version: str
    kampff_index: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    responses: list["ResponseOut"] = []


class SessionUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_version: Optional[str] = None
    model_provider: Optional[str] = None
    evaluator_credentials: Optional[str] = None
    conflict_disclosure: Optional[str] = None
    transcript_url: Optional[str] = None
    current_question: Optional[int] = None
    global_notes: Optional[str] = None


class SessionListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: str
    model_name: str
    model_version: Optional[str] = None
    model_provider: Optional[str] = None
    evaluator_name: str
    status: str
    kampff_index: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class SessionListOut(BaseModel):
    sessions: list[SessionListItem]
    total: int


# --- Response Schemas ---


class ResponseCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    question_id: int
    question_as_delivered: Optional[str] = None
    model_response: Optional[str] = None
    response_latency_seconds: Optional[float] = None
    score: Optional[int] = Field(None, ge=1, le=10)
    evaluator_notes: Optional[str] = None


class ResponseUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    question_as_delivered: Optional[str] = None
    model_response: Optional[str] = None
    response_latency_seconds: Optional[float] = None
    score: Optional[int] = Field(None, ge=1, le=10)
    evaluator_notes: Optional[str] = None


class ResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    session_id: str
    question_id: int
    question_as_delivered: Optional[str] = None
    model_response: Optional[str] = None
    response_latency_seconds: Optional[float] = None
    score: Optional[int] = None
    evaluator_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# --- Scoring Schemas ---


class ScoringReport(BaseModel):
    kampff_index: float
    total_score: int
    questions_scored: int
    dimensional_scores: dict[str, dict]
    round_progression: list[dict]
    score_distribution: dict[int, int]
    safety_patterns: list[dict]
    interpretation: dict


# --- Comparison Schemas ---


class ComparisonRequest(BaseModel):
    session_ids: list[str]


class ComparisonSessionSummary(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    session_id: str
    model_name: str
    model_version: Optional[str] = None
    model_provider: Optional[str] = None
    evaluator_name: str
    kampff_index: Optional[float] = None
    dimensional_scores: dict[str, dict] = {}
    round_progression: list[dict] = []
    interpretation: dict = {}


class ComparisonResult(BaseModel):
    sessions: list[ComparisonSessionSummary]
    rankings: list[dict]
