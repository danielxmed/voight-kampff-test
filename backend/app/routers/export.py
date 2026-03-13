from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import EvaluationSession, Question
from app.services.pdf_export import generate_pdf
from app.services.scoring import generate_full_report

router = APIRouter(prefix="/api/export", tags=["export"])


async def _load_session_data(session_id: str, db: AsyncSession):
    """Load session with responses and joined question data."""
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
        "benchmark_version": session.benchmark_version,
        "kampff_index": session.kampff_index,
        "global_notes": session.global_notes,
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


@router.get("/{session_id}/json")
async def export_json(session_id: str, db: AsyncSession = Depends(get_db)):
    """Export session data as JSON."""
    session_dict, responses_with_questions = await _load_session_data(session_id, db)
    report = generate_full_report(session_dict, responses_with_questions)

    export_data = {
        "session": session_dict,
        "responses": responses_with_questions,
        "scoring": report,
    }

    # Convert datetime objects to strings for JSON serialization
    for key in ["created_at", "completed_at"]:
        val = export_data["session"].get(key)
        if val is not None:
            export_data["session"][key] = val.isoformat() if hasattr(val, "isoformat") else str(val)

    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f'attachment; filename="vk_report_{session_id}.json"'
        },
    )


@router.get("/{session_id}/pdf")
async def export_pdf(session_id: str, db: AsyncSession = Depends(get_db)):
    """Export session data as PDF."""
    session_dict, responses_with_questions = await _load_session_data(session_id, db)

    # Sort responses by question code for consistent ordering
    responses_with_questions.sort(
        key=lambda r: (r.get("round_number", 0), r.get("question_code", ""))
    )

    pdf_bytes = generate_pdf(session_dict, responses_with_questions)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="vk_report_{session_id}.pdf"'
        },
    )
