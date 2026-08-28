from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel


class OnboardingIn(BaseModel):
    """Goal-first onboarding answers. Every field is optional so the user can
    skip anything except (implicitly) primary_goal, which the UI should ask
    first but the API still accepts as None for partial saves."""
    primary_goal: Optional[str] = None
    areas_of_interest: Optional[list[str]] = None
    budget_range: Optional[str] = None
    market: Optional[str] = None
    climate: Optional[str] = None
    climate_consent: bool = False
    skin_sensitivities: Optional[list[str]] = None
    declared_allergies: Optional[list[str]] = None
    hair_texture_reported: Optional[str] = None
    hair_treatment_history: Optional[list[str]] = None
    current_routine: Optional[str] = None
    style_preferences: Optional[list[str]] = None
    maintenance_tolerance: Optional[str] = None
    time_available: Optional[str] = None
    keep_using_items: Optional[str] = None
    gender_presentation: Optional[str] = None
    modesty_preference: Optional[str] = None
    skipped_fields: Optional[list[str]] = None


class OnboardingOut(OnboardingIn):
    id: str
    user_id: str
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AttributeValueOut(BaseModel):
    """One derived attribute in the Vibe Profile, always self-explaining."""
    value: Any = None
    original_value: Optional[Any] = None  # set only when a user correction overrides a scan/questionnaire value
    confidence: str  # high | usable_with_caution | retake_recommended | self_reported | user_corrected | unknown
    source: str      # scan | questionnaire | user_correction | rules | none
    updated_at: Optional[datetime] = None
    explanation: str
    limitations: Optional[str] = None


class VibeProfileOut(BaseModel):
    user_id: str
    goal: Optional[str] = None
    areas_of_interest: list[str] = []
    constraints: dict[str, Any] = {}
    attributes: dict[str, AttributeValueOut] = {}
    has_scan: bool = False
    has_onboarding: bool = False
    last_scan_at: Optional[datetime] = None


class CorrectionIn(BaseModel):
    attribute_key: str
    corrected_value: Any
    note: Optional[str] = None


class CorrectionOut(BaseModel):
    id: str
    attribute_key: str
    corrected_value: Any
    note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
