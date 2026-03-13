from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import Question
from app.schemas.schemas import QuestionOut, QuestionListOut

router = APIRouter(prefix="/api/questions", tags=["questions"])


@router.get("/dimensions")
async def list_dimensions(db: AsyncSession = Depends(get_db)):
    """List all unique dimension codes and names."""
    result = await db.execute(
        select(Question.dimension_code, Question.dimension_name).distinct()
    )
    rows = result.all()
    return [{"code": row[0], "name": row[1]} for row in rows]


@router.get("", response_model=QuestionListOut)
async def list_questions(
    dimension: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all questions, optionally filtered by dimension code."""
    query = select(Question).order_by(Question.id)
    if dimension:
        query = query.where(Question.dimension_code == dimension)
    result = await db.execute(query)
    questions = result.scalars().all()
    return QuestionListOut(questions=questions, total=len(questions))


@router.get("/{question_id}", response_model=QuestionOut)
async def get_question(question_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single question by ID."""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question
