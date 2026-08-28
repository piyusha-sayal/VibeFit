from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, field_validator

FEEDBACK_TYPES = {
    "saved", "completed", "helpful", "not_relevant", "too_expensive",
    "unavailable", "too_much_maintenance", "irritation", "prefer_another",
}


class PlanActionOut(BaseModel):
    id: str
    rank: int
    category: str
    title: str
    why: str
    confidence_label: str
    limitations: Optional[str] = None
    is_avoid: bool
    items: Optional[list[Any]] = None
    feedback: list[str] = []

    model_config = {"from_attributes": True}


class ActionPlanOut(BaseModel):
    goal: Optional[str] = None
    top_actions: list[PlanActionOut]
    avoid: list[PlanActionOut]
    check_in_at: datetime
    generated_at: datetime
    profile_complete: bool
    limitations_summary: Optional[str] = None


class ActionFeedbackIn(BaseModel):
    feedback_type: str
    note: Optional[str] = None

    @field_validator("feedback_type")
    @classmethod
    def known_feedback_type(cls, v: str) -> str:
        if v not in FEEDBACK_TYPES:
            raise ValueError(f"feedback_type must be one of {sorted(FEEDBACK_TYPES)}")
        return v


class ActionFeedbackOut(BaseModel):
    id: str
    action_id: str
    feedback_type: str
    note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
