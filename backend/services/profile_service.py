"""Builds the unified, read-only Vibe Profile view from three independent
sources — the latest completed scan, the onboarding questionnaire, and any
user corrections — without duplicating or overwriting any of them.

No attribute here is ever averaged into a single score. Skin/hair/body
attributes are described as visible cosmetic observations, not diagnoses.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable, Optional

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models.analysis import Analysis
from models.profile import OnboardingResponse, ProfileCorrection
from schemas.profile import AttributeValueOut, VibeProfileOut

_QUALITY_TO_CONFIDENCE = {
    "good": "high",
    "fair": "usable_with_caution",
    "poor": "retake_recommended",
}


def _get(d: Optional[dict], key: str) -> Any:
    return (d or {}).get(key)


class _Spec:
    def __init__(self, key: str, extract: Callable[[Analysis], Any], explanation: str, limitations: str) -> None:
        self.key = key
        self.extract = extract
        self.explanation = explanation
        self.limitations = limitations


ATTRIBUTE_SPECS: list[_Spec] = [
    _Spec("face_shape", lambda a: _get(a.face_analysis, "shape"),
          "Estimated from facial landmark proportions (width vs. length, jaw/forehead ratios) in your most recent scan.",
          "A tilted photo or hair covering the hairline can shift this estimate."),
    _Spec("undertone", lambda a: _get(a.color_analysis, "skinUndertone"),
          "Estimated from skin-tone sampling at cheek points in your scan photo.",
          "Indoor lighting color temperature and camera white balance can shift undertone estimates."),
    _Spec("contrast_level", lambda a: _get(a.color_analysis, "contrastLevel"),
          "Estimated contrast between your skin, hair, and eye color in the scan photo.",
          "Photo exposure and lighting affect measured contrast."),
    _Spec("skin_texture", lambda a: _get(a.skin_analysis, "texture"),
          "A visible-texture observation (surface variance across cheeks/forehead) — not a skin-health diagnosis.",
          "Blur, camera distance, and makeup all change how texture appears in a photo."),
    _Spec("skin_evenness", lambda a: _get(a.skin_analysis, "evenness"),
          "A visible tone-uniformity observation across facial skin regions in your scan photo.",
          "Lighting evenness across the face affects this reading."),
    _Spec("skin_redness", lambda a: _get(a.skin_analysis, "redness"),
          "A visible redness observation from color sampling — not a diagnosis of any skin condition.",
          "Camera white balance and flash can shift color readings."),
    _Spec("skin_under_eye", lambda a: _get(a.skin_analysis, "underEye"),
          "A visible under-eye appearance observation compared to nearby cheek tone.",
          "Screen/room lighting and camera angle affect this reading."),
    _Spec("skin_oiliness", lambda a: _get(a.skin_analysis, "oiliness"),
          "A visible shine/matte observation across T-zone and cheeks in your scan photo.",
          "Time since cleansing and photo lighting affect apparent shine."),
    _Spec("hair_texture", lambda a: _get(a.hair_analysis, "texture"),
          "Estimated from the visible hair strand pattern in your scan photo.",
          "Wet hair, styling products, or updos can obscure natural texture."),
    _Spec("body_shape", lambda a: _get(a.body_analysis, "shape"),
          "Estimated from shoulder/waist/hip proportions in a frontal-pose scan photo.",
          "Loose clothing or a non-frontal pose reduces accuracy."),
]

CONSTRAINT_FIELDS = [
    "budget_range", "market", "climate", "skin_sensitivities", "declared_allergies",
    "hair_texture_reported", "hair_treatment_history", "current_routine",
    "style_preferences", "maintenance_tolerance", "time_available",
    "keep_using_items", "gender_presentation", "modesty_preference",
]


async def get_onboarding(db: AsyncSession, user_id: str) -> Optional[OnboardingResponse]:
    result = await db.execute(select(OnboardingResponse).where(OnboardingResponse.user_id == user_id))
    return result.scalar_one_or_none()


async def get_latest_analysis(db: AsyncSession, user_id: str) -> Optional[Analysis]:
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == user_id, Analysis.status == "complete")
        .order_by(desc(Analysis.created_at))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_latest_corrections(db: AsyncSession, user_id: str) -> dict[str, ProfileCorrection]:
    """Most recent correction per attribute_key (corrections are append-only)."""
    result = await db.execute(
        select(ProfileCorrection)
        .where(ProfileCorrection.user_id == user_id)
        .order_by(ProfileCorrection.created_at)
    )
    latest: dict[str, ProfileCorrection] = {}
    for row in result.scalars().all():
        latest[row.attribute_key] = row  # later rows overwrite -> keeps most recent
    return latest


async def build_vibe_profile(db: AsyncSession, user_id: str) -> VibeProfileOut:
    analysis = await get_latest_analysis(db, user_id)
    onboarding = await get_onboarding(db, user_id)
    corrections = await get_latest_corrections(db, user_id)

    quality_overall = _get(analysis.quality if analysis else None, "overall")
    scan_confidence = _QUALITY_TO_CONFIDENCE.get(quality_overall, "unknown")

    attributes: dict[str, AttributeValueOut] = {}
    for spec in ATTRIBUTE_SPECS:
        scan_value = spec.extract(analysis) if analysis else None
        correction = corrections.get(spec.key)

        if correction is not None:
            attributes[spec.key] = AttributeValueOut(
                value=correction.corrected_value,
                original_value=scan_value,
                confidence="user_corrected",
                source="user_correction",
                updated_at=correction.created_at,
                explanation=spec.explanation,
                limitations=spec.limitations,
            )
        elif analysis is not None and scan_value is not None:
            attributes[spec.key] = AttributeValueOut(
                value=scan_value,
                original_value=None,
                confidence=scan_confidence,
                source="scan",
                updated_at=analysis.updated_at,
                explanation=spec.explanation,
                limitations=spec.limitations,
            )
        else:
            attributes[spec.key] = AttributeValueOut(
                value=None,
                original_value=None,
                confidence="unknown",
                source="none",
                updated_at=None,
                explanation=spec.explanation,
                limitations="No scan or correction yet for this attribute.",
            )

    constraints: dict[str, Any] = {}
    if onboarding is not None:
        for field in CONSTRAINT_FIELDS:
            constraints[field] = getattr(onboarding, field)

    return VibeProfileOut(
        user_id=user_id,
        goal=onboarding.primary_goal if onboarding else None,
        areas_of_interest=(onboarding.areas_of_interest if onboarding and onboarding.areas_of_interest else []),
        constraints=constraints,
        attributes=attributes,
        has_scan=analysis is not None,
        has_onboarding=onboarding is not None,
        last_scan_at=analysis.updated_at if analysis else None,
    )


async def save_correction(db: AsyncSession, user_id: str, attribute_key: str,
                           corrected_value: Any, note: Optional[str]) -> ProfileCorrection:
    correction = ProfileCorrection(
        user_id=user_id, attribute_key=attribute_key,
        corrected_value=corrected_value, note=note,
    )
    db.add(correction)
    await db.flush()
    return correction


async def upsert_onboarding(db: AsyncSession, user_id: str, data: dict) -> OnboardingResponse:
    onboarding = await get_onboarding(db, user_id)
    if onboarding is None:
        onboarding = OnboardingResponse(user_id=user_id)
        db.add(onboarding)

    for field, value in data.items():
        setattr(onboarding, field, value)

    if onboarding.primary_goal and onboarding.completed_at is None:
        onboarding.completed_at = datetime.now(timezone.utc)

    await db.flush()
    return onboarding
