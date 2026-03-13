from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import EvaluationSession, QuestionResponse, Question
from app.schemas.schemas import (
    ComparisonRequest,
    ComparisonResult,
    ComparisonSessionSummary,
)
from app.services.scoring import (
    compute_kampff_index,
    compute_dimensional_scores,
    compute_round_progression,
    get_interpretation,
)

router = APIRouter(prefix="/api/comparison", tags=["comparison"])


async def _build_session_summary(
    session: EvaluationSession, db: AsyncSession
) -> ComparisonSessionSummary:
    """Build a comparison summary for a single session."""
    responses_with_questions = []
    scores = []

    for resp in session.responses:
        q_result = await db.execute(
            select(Question).where(Question.id == resp.question_id)
        )
        question = q_result.scalar_one_or_none()
        if question and resp.score is not None:
            responses_with_questions.append({
                "dimension_code": question.dimension_code,
                "dimension_name": question.dimension_name,
                "question_code": question.code,
                "round_number": question.round_number,
                "score": resp.score,
            })
            scores.append(resp.score)

    ki = compute_kampff_index(scores) if scores else None
    dim_scores = compute_dimensional_scores(responses_with_questions)
    round_prog = compute_round_progression(responses_with_questions)
    interp = get_interpretation(ki) if ki is not None else {}

    return ComparisonSessionSummary(
        session_id=session.id,
        model_name=session.model_name,
        model_version=session.model_version,
        model_provider=session.model_provider,
        evaluator_name=session.evaluator_name,
        kampff_index=ki,
        dimensional_scores=dim_scores,
        round_progression=round_prog,
        interpretation=interp,
    )


@router.post("", response_model=ComparisonResult)
async def compare_sessions(
    data: ComparisonRequest, db: AsyncSession = Depends(get_db)
):
    """Compare multiple evaluation sessions."""
    if len(data.session_ids) < 2:
        raise HTTPException(
            status_code=400, detail="At least 2 session IDs required for comparison"
        )

    summaries = []
    for sid in data.session_ids:
        result = await db.execute(
            select(EvaluationSession)
            .options(selectinload(EvaluationSession.responses))
            .where(EvaluationSession.id == sid)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {sid} not found")
        summary = await _build_session_summary(session, db)
        summaries.append(summary)

    # Build rankings sorted by kampff_index descending
    ranked = sorted(
        summaries,
        key=lambda s: s.kampff_index if s.kampff_index is not None else -1,
        reverse=True,
    )
    rankings = [
        {
            "rank": i + 1,
            "session_id": s.session_id,
            "model_name": s.model_name,
            "kampff_index": s.kampff_index,
        }
        for i, s in enumerate(ranked)
    ]

    return ComparisonResult(sessions=summaries, rankings=rankings)


@router.get("/models")
async def list_models_with_best_sessions(db: AsyncSession = Depends(get_db)):
    """Get list of unique models with their best (highest kampff_index) session."""
    result = await db.execute(
        select(EvaluationSession).order_by(EvaluationSession.created_at.desc())
    )
    sessions = result.scalars().all()

    models: dict[str, dict] = {}
    for session in sessions:
        key = session.model_name
        if key not in models:
            models[key] = {
                "model_name": session.model_name,
                "best_session_id": session.id,
                "best_kampff_index": session.kampff_index,
                "session_count": 1,
            }
        else:
            models[key]["session_count"] += 1
            current_best = models[key]["best_kampff_index"]
            if session.kampff_index is not None and (
                current_best is None or session.kampff_index > current_best
            ):
                models[key]["best_session_id"] = session.id
                models[key]["best_kampff_index"] = session.kampff_index

    return list(models.values())
