from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.user import User
from schemas.plan import ActionPlanOut, ActionFeedbackIn, ActionFeedbackOut
from services import plan_service
from services.ai_service import AIService
from api.deps import get_current_user, get_ai_service

router = APIRouter(prefix="/plan", tags=["plan"])


@router.get("", response_model=ActionPlanOut)
async def get_plan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ai: AIService = Depends(get_ai_service),
):
    """Recomputes the plan from the current Vibe Profile every call (cheap,
    deterministic) and upserts the underlying PlanAction rows so ids — and any
    feedback already recorded against them — stay stable across regenerations."""
    return await plan_service.generate_plan(db, current_user.id, ai)


@router.post("/{action_id}/feedback", response_model=ActionFeedbackOut, status_code=201)
async def submit_feedback(
    action_id: str,
    body: ActionFeedbackIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    feedback = await plan_service.record_feedback(db, current_user.id, action_id, body.feedback_type, body.note)
    if feedback is None:
        raise HTTPException(status_code=404, detail="Action not found")
    return feedback
