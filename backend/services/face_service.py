"""Assemble the shared face profile.

Four kinds of information are kept apart, because conflating them is how an app
ends up presenting a guess as a fact:

- `scan`        — what the existing MediaPipe pass measured.
- `derived`     — computed from a scan without new image work.
- `user`        — what the user selected or confirmed themselves.
- `unset`       — nothing yet, with the action that would fill it.

A user selection always wins over a scan reading when recommendations are
generated, and the original scan value is kept beside it so the difference stays
visible.

Existing analyses are reused. Nothing here re-runs image analysis.
"""
from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.analysis import Analysis
from models.profile import OnboardingResponse, ProfileCorrection
from rules.face_attributes import (
    FACE_ATTRIBUTES, brow_shape_from_map, contrast_from_colour, option_for,
)
from rules.face_shape_rules import FACE_SHAPE_GUIDES, guide_for

# Attribute keys stored as profile corrections. Reusing the existing
# append-only corrections table rather than adding a parallel store.
FACE_ATTRIBUTE_PREFIX = "face."


def correction_key(attribute_key: str) -> str:
    return f"{FACE_ATTRIBUTE_PREFIX}{attribute_key}"


async def latest_analysis(db: AsyncSession, user_id: str) -> Analysis | None:
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == user_id, Analysis.status == "complete")
        .order_by(desc(Analysis.created_at))
        .limit(1)
    )
    return result.scalars().first()


async def latest_corrections(db: AsyncSession, user_id: str) -> dict[str, ProfileCorrection]:
    """Most recent correction per key; the table is append-only by design."""
    result = await db.execute(
        select(ProfileCorrection)
        .where(ProfileCorrection.user_id == user_id)
        .order_by(ProfileCorrection.created_at)
    )
    latest: dict[str, ProfileCorrection] = {}
    for row in result.scalars().all():
        latest[row.attribute_key] = row
    return latest


def _attribute_entry(attr_key: str, scan_value: str | None, correction: ProfileCorrection | None,
                     *, method: str) -> dict:
    attribute = FACE_ATTRIBUTES[attr_key]
    user_value = str(correction.corrected_value) if correction else None
    effective = user_value or scan_value

    option = option_for(attr_key, effective) if effective else None
    return {
        "key": attr_key,
        "label": attribute.label,
        "intro": attribute.intro,
        "method": method or attribute.method,
        # What the scan said, kept even when the user disagrees.
        "scanValue": scan_value,
        "userValue": user_value,
        "value": effective,
        "valueLabel": option.label if option else None,
        "styling": list(option.styling) if option else [],
        "source": "user" if user_value else ("scan" if scan_value else "unset"),
        "overridden": bool(user_value and scan_value and user_value != scan_value),
        "options": [
            {"key": o.key, "label": o.label, "description": o.description, "styling": list(o.styling)}
            for o in attribute.options
        ],
    }


def build_face_shape(analysis: Analysis | None, corrections: dict[str, ProfileCorrection]) -> dict:
    """Face shape, with the scan estimate and any user override side by side."""
    face = (analysis.face_analysis if analysis else None) or {}
    scan_shape = face.get("shape")
    correction = corrections.get(correction_key("face_shape")) or corrections.get("face_shape")
    user_shape = str(correction.corrected_value) if correction else None
    effective = user_shape or scan_shape

    guide = guide_for(effective) if effective else None
    return {
        "value": effective,
        "scanValue": scan_shape,
        "userValue": user_shape,
        "source": "user" if user_shape else ("scan" if scan_shape else "unset"),
        "overridden": bool(user_shape and scan_shape and user_shape != scan_shape),
        "alternate": face.get("alternateShape"),
        "confidence": face.get("shapeConfidence"),
        "measurements": face.get("shapeMeasurements") or {},
        "options": sorted(FACE_SHAPE_GUIDES),
        "guide": None if not guide else {
            "summary": guide.summary,
            "goals": list(guide.goals),
            "hairstyles": list(guide.hairstyles),
            "necklines": list(guide.necklines),
            "glasses": list(guide.glasses),
            "earrings": list(guide.earrings),
            "makeup": list(guide.makeup),
            "beard": list(guide.beard),
        },
    }


async def build_face_profile(db: AsyncSession, user_id: str) -> dict:
    analysis = await latest_analysis(db, user_id)
    corrections = await latest_corrections(db, user_id)
    onboarding = (await db.execute(
        select(OnboardingResponse).where(OnboardingResponse.user_id == user_id)
    )).scalars().first()

    face = (analysis.face_analysis if analysis else None) or {}
    colours = (analysis.color_analysis if analysis else None) or {}
    hair = (analysis.hair_analysis if analysis else None) or {}

    shape = build_face_shape(analysis, corrections)

    # Scan-backed starting values, where the existing pipeline really produces one.
    scan_values = {
        "brow_shape": brow_shape_from_map(face.get("eyebrow")),
        "facial_contrast": contrast_from_colour(colours),
        "eye_shape": None,
        "lip_shape": None,
        "cheek_contour": None,
    }
    methods = {
        "brow_shape": "Measured from the brow landmarks in your most recent scan.",
        "facial_contrast": "Derived from the contrast level in your colour analysis — no extra scan.",
    }

    attributes = [
        _attribute_entry(
            key,
            scan_values.get(key),
            corrections.get(correction_key(key)),
            method=methods.get(key, ""),
        )
        for key in FACE_ATTRIBUTES
    ]

    known = sum(1 for a in attributes if a["value"]) + (1 if shape["value"] else 0)
    total = len(attributes) + 1

    return {
        "faceShape": shape,
        "attributes": attributes,
        "completion": round(known / total, 2),
        "known": known,
        "total": total,
        "hasScan": analysis is not None,
        "analysisId": analysis.id if analysis else None,
        "analysedAt": analysis.created_at if analysis else None,
        # Context other studios personalise from, read from what already exists.
        "context": {
            "hairTexture": (onboarding.hair_texture_reported if onboarding else None) or hair.get("texture"),
            "hairLength": hair.get("length"),
            "season": colours.get("skinUndertone"),
            "contrastLevel": colours.get("contrastLevel"),
            "maintenanceTolerance": onboarding.maintenance_tolerance if onboarding else None,
            "timeAvailable": onboarding.time_available if onboarding else None,
            "stylePreferences": (onboarding.style_preferences if onboarding else None) or [],
            "genderPresentation": onboarding.gender_presentation if onboarding else None,
        },
        "proportions": face.get("proportions") or {},
        "browMap": face.get("eyebrow") or {},
    }


async def effective_face_shape(db: AsyncSession, user_id: str) -> str | None:
    """The shape recommendations should use: the user's, else the scan's."""
    analysis = await latest_analysis(db, user_id)
    corrections = await latest_corrections(db, user_id)
    return build_face_shape(analysis, corrections)["value"]


async def studio_context(db: AsyncSession, user_id: str) -> dict:
    """The facts Hair, Makeup and Accessories all personalise from.

    One source, so the studios cannot contradict each other. Every value is
    optional: a studio with no context still returns its full library, just
    unranked.
    """
    from rules.color_season import build_color_report  # local: avoids a cycle

    profile = await build_face_profile(db, user_id)
    analysis = await latest_analysis(db, user_id)
    colours = (analysis.color_analysis if analysis else None) or {}
    report = build_color_report(colours)

    confirmed = {
        a["key"]: a["value"] for a in profile["attributes"] if a["value"]
    }
    return {
        "faceShape": profile["faceShape"]["value"],
        "faceShapeSource": profile["faceShape"]["source"],
        "attributes": confirmed,
        "season": report["season"] if report else None,
        "seasonLabel": report["label"] if report else None,
        "seasonFamily": report["family"] if report else None,
        "undertone": colours.get("skinUndertone"),
        "contrast": confirmed.get("facial_contrast"),
        "hairTexture": profile["context"]["hairTexture"],
        "maintenanceTolerance": profile["context"]["maintenanceTolerance"],
        "timeAvailable": profile["context"]["timeAvailable"],
        "genderPresentation": profile["context"]["genderPresentation"],
        "hasScan": profile["hasScan"],
    }
