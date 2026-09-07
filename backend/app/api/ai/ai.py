from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.ai_service import explain_commit, career_coach


router = APIRouter(
    prefix="/api/ai",
    tags=["AI"]
)


class CommitRequest(BaseModel):
    message: str


class CareerCoachRequest(BaseModel):
    readiness_score: int
    readiness_label: str
    repositories: int
    total_stars: int
    total_forks: int
    total_commits: int
    average_repo_score: float
    average_commit_quality: float


@router.post("/explain-commit")
def explain_commit_api(request: CommitRequest):

    try:

        explanation = explain_commit(request.message)

        return {
            "explanation": explanation
        }

    except Exception as e:

        print("AI ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="AI service temporarily unavailable."
        )


@router.post("/career-coach")
def career_coach_api(request: CareerCoachRequest):

    try:

        advice = career_coach(
            readiness_score=request.readiness_score,
            readiness_label=request.readiness_label,
            repositories=request.repositories,
            total_stars=request.total_stars,
            total_forks=request.total_forks,
            total_commits=request.total_commits,
            average_repo_score=request.average_repo_score,
            average_commit_quality=request.average_commit_quality
        )

        return {
            "success": True,
            "advice": advice
        }

    except Exception as e:

        print("CAREER COACH ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )