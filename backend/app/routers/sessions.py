from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import EvaluationSession, QuestionResponse, Question
from app.schemas.schemas import (
    SessionCreate,
    SessionOut,
    SessionUpdate,
    SessionListOut,
    SessionListItem,
)
from app.services.scoring import compute_kampff_index

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionOut, status_code=201)
async def create_session(data: SessionCreate, db: AsyncSession = Depends(get_db)):
    """Create a new evaluation session."""
    session = EvaluationSession(**data.model_dump())
    db.add(session)
    await db.flush()
    await db.refresh(session, attribute_names=["responses"])
    return session


@router.get("", response_model=SessionListOut)
async def list_sessions(db: AsyncSession = Depends(get_db)):
    """List all sessions."""
    result = await db.execute(
        select(EvaluationSession).order_by(EvaluationSession.created_at.desc())
    )
    sessions = result.scalars().all()
    items = [SessionListItem.model_validate(s) for s in sessions]
    return SessionListOut(sessions=items, total=len(items))


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get a session with its responses."""
    result = await db.execute(
        select(EvaluationSession)
        .options(selectinload(EvaluationSession.responses))
        .where(EvaluationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: str,
    data: SessionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update session fields."""
    result = await db.execute(
        select(EvaluationSession)
        .options(selectinload(EvaluationSession.responses))
        .where(EvaluationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)

    await db.flush()
    await db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a session and all its responses."""
    result = await db.execute(
        select(EvaluationSession).where(EvaluationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.execute(
        delete(QuestionResponse).where(QuestionResponse.session_id == session_id)
    )
    await db.delete(session)
    await db.flush()


@router.post("/{session_id}/complete", response_model=SessionOut)
async def complete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Mark session as completed and compute Kampff Index."""
    result = await db.execute(
        select(EvaluationSession)
        .options(selectinload(EvaluationSession.responses))
        .where(EvaluationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    scores = [r.score for r in session.responses if r.score is not None]
    session.kampff_index = compute_kampff_index(scores)
    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(session)
    return session
