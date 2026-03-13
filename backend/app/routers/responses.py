from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import EvaluationSession, QuestionResponse, Question
from app.schemas.schemas import ResponseCreate, ResponseUpdate, ResponseOut

router = APIRouter(prefix="/api/sessions/{session_id}/responses", tags=["responses"])


@router.post("", response_model=ResponseOut, status_code=201)
async def create_or_upsert_response(
    session_id: str,
    data: ResponseCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create or upsert a response for a session."""
    # Verify session exists
    sess_result = await db.execute(
        select(EvaluationSession).where(EvaluationSession.id == session_id)
    )
    if not sess_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify question exists
    q_result = await db.execute(
        select(Question).where(Question.id == data.question_id)
    )
    if not q_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Question not found")

    # Check for existing response (upsert)
    existing_result = await db.execute(
        select(QuestionResponse).where(
            QuestionResponse.session_id == session_id,
            QuestionResponse.question_id == data.question_id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        # Update existing
        update_data = data.model_dump(exclude_unset=True, exclude={"question_id"})
        for field, value in update_data.items():
            setattr(existing, field, value)
        existing.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(existing)
        return existing
    else:
        # Create new
        response = QuestionResponse(
            session_id=session_id,
            **data.model_dump(),
        )
        db.add(response)
        await db.flush()
        await db.refresh(response)
        return response


@router.put("/{question_id}", response_model=ResponseOut)
async def update_response(
    session_id: str,
    question_id: int,
    data: ResponseUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a specific response."""
    result = await db.execute(
        select(QuestionResponse).where(
            QuestionResponse.session_id == session_id,
            QuestionResponse.question_id == question_id,
        )
    )
    response = result.scalar_one_or_none()
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(response, field, value)
    response.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(response)
    return response


@router.get("", response_model=list[ResponseOut])
async def list_responses(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get all responses for a session."""
    # Verify session exists
    sess_result = await db.execute(
        select(EvaluationSession).where(EvaluationSession.id == session_id)
    )
    if not sess_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(QuestionResponse)
        .where(QuestionResponse.session_id == session_id)
        .order_by(QuestionResponse.question_id)
    )
    return result.scalars().all()
