from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import EvaluationSession, QuestionResponse, Question
from app.schemas.schemas import ScoringReport
from app.services.scoring import generate_full_report

router = APIRouter(prefix="/api/scoring", tags=["scoring"])


async def _get_responses_with_questions(
    session_id: str, db: AsyncSession
) -> tuple[dict, list[dict]]:
    """Helper to load session and responses joined with questions."""
    result = await db.execute(
        select(EvaluationSession)
        .options(selectinload(EvaluationSession.responses))
        .where(EvaluationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session_dict = {
        "id": session.id,
        "model_name": session.model_name,
        "model_version": session.model_version,
        "model_provider": session.model_provider,
        "evaluator_name": session.evaluator_name,
        "evaluator_credentials": session.evaluator_credentials,
        "status": session.status,
        "created_at": session.created_at,
        "completed_at": session.completed_at,
    }

    responses_with_questions = []
    for resp in session.responses:
        q_result = await db.execute(
            select(Question).where(Question.id == resp.question_id)
        )
        question = q_result.scalar_one_or_none()
        if question:
            responses_with_questions.append({
                "question_id": resp.question_id,
                "question_code": question.code,
                "dimension_code": question.dimension_code,
                "dimension_name": question.dimension_name,
                "round_number": question.round_number,
                "question_text": question.question_text,
                "question_as_delivered": resp.question_as_delivered,
                "model_response": resp.model_response,
                "response_latency_seconds": resp.response_latency_seconds,
                "score": resp.score,
                "evaluator_notes": resp.evaluator_notes,
            })

    return session_dict, responses_with_questions


@router.get("/{session_id}", response_model=ScoringReport)
async def get_scoring_report(
    session_id: str, db: AsyncSession = Depends(get_db)
):
    """Get full scoring report for a session."""
    session_dict, responses_with_questions = await _get_responses_with_questions(
        session_id, db
    )
    report = generate_full_report(session_dict, responses_with_questions)
    return ScoringReport(**report)
