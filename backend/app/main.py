from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import Base, engine, async_session_maker
from app.models.models import Question
from app.seed.questions import SEED_QUESTIONS

from app.routers import questions, sessions, responses, scoring, comparison, export


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and seed questions on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed questions if table is empty
    async with async_session_maker() as session:
        result = await session.execute(select(Question).limit(1))
        if result.scalar_one_or_none() is None:
            for q_data in SEED_QUESTIONS:
                session.add(Question(**q_data))
            await session.commit()

    yield

    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(questions.router)
app.include_router(sessions.router)
app.include_router(responses.router)
app.include_router(scoring.router)
app.include_router(comparison.router)
app.include_router(export.router)


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }
