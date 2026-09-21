"""Discover My Face: the shared face profile, the shape report, and overrides.

Every studio reads its face context from here, so Hair, Makeup and Accessories
cannot drift apart.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from core.database import get_db
from models.profile import ProfileCorrection
from models.user import User
from rules.face_attributes import FACE_ATTRIBUTES, is_valid
from rules.face_shape_rules import FACE_SHAPE_GUIDES, guide_for
from services.face_service import build_face_profile, correction_key
from services.passport_service import record_activity

router = APIRouter(prefix="/face", tags=["face"])

# The shape report never ranks or scores a face. This line is rendered with it.
REPORT_DISCLAIMER = (
    "Face shape is a styling starting point, not a verdict. VibeFit does not "
    "rate faces, and no shape is better than another."
)


class AttributeUpdate(BaseModel):
    value: str = Field(min_length=1, max_length=60)
    note: str | None = Field(default=None, max_length=500)


@router.get("/profile")
async def get_face_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The shared face profile every studio personalises from."""
    profile = await build_face_profile(db, current_user.id)
    return {**profile, "disclaimer": REPORT_DISCLAIMER}


@router.get("/attributes")
async def list_attributes():
    """The attribute vocabulary, including how each one is determined."""
    return {
        "attributes": [
            {
                "key": attribute.key,
                "label": attribute.label,
                "source": attribute.source,
                "intro": attribute.intro,
                "method": attribute.method,
                "options": [
                    {"key": o.key, "label": o.label, "description": o.description,
                     "styling": list(o.styling)}
                    for o in attribute.options
                ],
            }
            for attribute in FACE_ATTRIBUTES.values()
        ]
    }


@router.put("/attributes/{attribute_key}")
async def set_attribute(
    attribute_key: str,
    payload: AttributeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Record what the user confirmed. The scan reading is kept alongside it."""
    if attribute_key not in FACE_ATTRIBUTES:
        raise HTTPException(status_code=404, detail="Unknown attribute")
    if not is_valid(attribute_key, payload.value):
        raise HTTPException(status_code=422, detail="Not a valid option for this attribute")

    # Append-only: the correction history stays intact, and the row is always
    # written against the authenticated user, never an id from the request.
    db.add(ProfileCorrection(
        user_id=current_user.id,
        attribute_key=correction_key(attribute_key),
        corrected_value=payload.value,
        note=payload.note,
    ))
    await record_activity(db, current_user.id, "face_attribute",
                          f"Confirmed {FACE_ATTRIBUTES[attribute_key].label.lower()}")
    await db.commit()

    profile = await build_face_profile(db, current_user.id)
    return {**profile, "disclaimer": REPORT_DISCLAIMER}


@router.put("/shape")
async def set_face_shape(
    payload: AttributeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Override the measured face shape. The measurement is still shown."""
    if payload.value not in FACE_SHAPE_GUIDES:
        raise HTTPException(status_code=422, detail="Unknown face shape")

    db.add(ProfileCorrection(
        user_id=current_user.id,
        attribute_key=correction_key("face_shape"),
        corrected_value=payload.value,
        note=payload.note,
    ))
    await record_activity(db, current_user.id, "face_shape", "Confirmed face shape")
    await db.commit()

    profile = await build_face_profile(db, current_user.id)
    return {**profile, "disclaimer": REPORT_DISCLAIMER}


@router.get("/shape-report")
async def get_shape_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The full styling report for the user's shape.

    404 rather than a default shape when nothing has been measured or chosen —
    an invented "oval" would be worse than an empty state.
    """
    profile = await build_face_profile(db, current_user.id)
    shape = profile["faceShape"]
    if not shape["value"]:
        raise HTTPException(
            status_code=404,
            detail="No face shape yet. Run a scan, or choose your shape.",
        )
    return {
        "faceShape": shape,
        "disclaimer": REPORT_DISCLAIMER,
        "measurementNote": (
            "Measured from your most recent scan. Lighting and head angle move "
            "these ratios, so treat them as approximate."
        ),
    }


@router.get("/shapes")
async def list_shapes():
    """All nine shapes with their guides, for browsing and manual selection."""
    return {
        "shapes": [
            {
                "key": key,
                "summary": guide_for(key).summary,
                "goals": list(guide_for(key).goals),
                "hairstyles": list(guide_for(key).hairstyles),
                "necklines": list(guide_for(key).necklines),
                "glasses": list(guide_for(key).glasses),
                "earrings": list(guide_for(key).earrings),
                "makeup": list(guide_for(key).makeup),
                "beard": list(guide_for(key).beard),
            }
            for key in sorted(FACE_SHAPE_GUIDES)
        ],
        "disclaimer": REPORT_DISCLAIMER,
    }
