"""Assemble the Beauty Passport from what the user has actually done.

Every attribute is either a real value the user supplied or a real result an
analysis produced. An attribute with no data is returned as `missing` with the
action that would fill it — never as a plausible-looking placeholder, which is
the same mistake the old no-face fallback made.
"""
from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.analysis import Analysis
from models.beauty import BeautyActivity, BeautyGoal, BeautyProfile, SavedLook, UserSettings
from models.profile import OnboardingResponse
from rules.color_season import build_color_report

# Which attributes count toward the completion ring, in display order.
ATTRIBUTE_ORDER = (
    "personal_colour",
    "undertone",
    "face_shape",
    "eye_shape",
    "hair_type",
    "hair_length",
    "body_type",
    "aesthetics",
    "lipstick_palette",
    "makeup_experience",
)

_ACTIONS = {
    "personal_colour": {"label": "Run a colour analysis", "route": "/scan"},
    "undertone": {"label": "Run a colour analysis", "route": "/scan"},
    "face_shape": {"label": "Scan your face", "route": "/scan"},
    "eye_shape": {"label": "Scan your face", "route": "/scan"},
    "hair_type": {"label": "Tell us your hair texture", "route": "/onboarding"},
    "hair_length": {"label": "Set your hair length", "route": "/style/profile"},
    "body_type": {"label": "Choose a body type — or skip it", "route": "/style/body"},
    "aesthetics": {"label": "Pick the aesthetics you like", "route": "/style/profile"},
    "lipstick_palette": {"label": "Run a colour analysis", "route": "/scan"},
    "makeup_experience": {"label": "Set your makeup experience", "route": "/style/profile"},
}


def _attr(key: str, label: str, value, *, detail: str | None = None, route: str | None = None) -> dict:
    """One passport row: present with a value, or missing with its next action."""
    if value in (None, "", [], {}):
        action = _ACTIONS.get(key, {})
        return {
            "key": key,
            "label": label,
            "status": "missing",
            "value": None,
            "detail": None,
            "action": action or None,
        }
    return {
        "key": key,
        "label": label,
        "status": "present",
        "value": value,
        "detail": detail,
        "route": route,
    }


async def _latest_analysis(db: AsyncSession, user_id: str) -> Analysis | None:
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == user_id, Analysis.status == "complete")
        .order_by(desc(Analysis.created_at))
        .limit(1)
    )
    return result.scalars().first()


async def _count(db: AsyncSession, model, *conditions) -> int:
    result = await db.execute(select(func.count()).select_from(model).where(*conditions))
    return int(result.scalar() or 0)


async def build_passport(db: AsyncSession, user_id: str) -> dict:
    analysis = await _latest_analysis(db, user_id)
    profile = (await db.execute(
        select(BeautyProfile).where(BeautyProfile.user_id == user_id)
    )).scalars().first()
    onboarding = (await db.execute(
        select(OnboardingResponse).where(OnboardingResponse.user_id == user_id)
    )).scalars().first()

    colours = (analysis.color_analysis if analysis else None) or {}
    face = (analysis.face_analysis if analysis else None) or {}
    hair = (analysis.hair_analysis if analysis else None) or {}
    features = (analysis.skin_analysis if analysis else None) or {}
    report = build_color_report(colours) if colours else None

    attributes = [
        _attr("personal_colour", "Personal colour",
              report["label"] if report else None,
              detail=report["summary"] if report else None,
              route="/colors/report"),
        _attr("undertone", "Undertone", colours.get("skinUndertone"), route="/colors/report"),
        _attr("face_shape", "Face shape", face.get("shape"), route="/face/shape"),
        _attr("eye_shape", "Eye shape", features.get("eyeShape"), route="/face/eyes"),
        _attr("hair_type", "Hair type",
              (onboarding.hair_texture_reported if onboarding else None) or hair.get("texture"),
              route="/face/hair"),
        _attr("hair_length", "Hair length",
              (profile.hair_length if profile else None) or hair.get("length"),
              route="/face/hair"),
        _attr("body_type", "Body type", profile.body_type if profile else None, route="/style/body"),
        _attr("aesthetics", "Style aesthetics",
              (profile.aesthetics if profile else None)
              or (onboarding.style_preferences if onboarding else None),
              route="/style/profile"),
        _attr("lipstick_palette", "Lipstick palette",
              [s["name"] for s in report["palettes"]["lipstick"]] if report else None,
              route="/colors/lipstick"),
        _attr("makeup_experience", "Makeup experience",
              profile.makeup_experience if profile else None, route="/makeup"),
    ]

    present = sum(1 for a in attributes if a["status"] == "present")
    completion = round(present / len(ATTRIBUTE_ORDER), 2)

    saved_looks = await _count(db, SavedLook, SavedLook.user_id == user_id)
    tried_looks = await _count(db, SavedLook, SavedLook.user_id == user_id, SavedLook.status == "tried")
    analyses_done = await _count(db, Analysis, Analysis.user_id == user_id, Analysis.status == "complete")
    active_goals = await _count(db, BeautyGoal, BeautyGoal.user_id == user_id, BeautyGoal.status == "active")

    recent = (await db.execute(
        select(BeautyActivity)
        .where(BeautyActivity.user_id == user_id)
        .order_by(desc(BeautyActivity.created_at))
        .limit(10)
    )).scalars().all()

    settings = (await db.execute(
        select(UserSettings).where(UserSettings.user_id == user_id)
    )).scalars().first()

    return {
        "attributes": attributes,
        "completion": completion,
        "completed": present,
        "total": len(ATTRIBUTE_ORDER),
        "nextAction": next((a["action"] for a in attributes if a["status"] == "missing"), None),
        "journey": {
            "analyses": analyses_done,
            "savedLooks": saved_looks,
            "triedLooks": tried_looks,
            "activeGoals": active_goals,
        },
        "timeline": [
            {"id": a.id, "kind": a.kind, "summary": a.summary,
             "refId": a.ref_id, "createdAt": a.created_at}
            for a in recent
        ],
        "latestAnalysisId": analysis.id if analysis else None,
        "photoReuseConsent": bool(settings.photo_reuse_consent) if settings else False,
    }


async def record_activity(db: AsyncSession, user_id: str, kind: str, summary: str,
                          ref_id: str | None = None) -> BeautyActivity:
    """Append one timeline entry. Callers flush; the request commits."""
    activity = BeautyActivity(user_id=user_id, kind=kind, summary=summary, ref_id=ref_id)
    db.add(activity)
    await db.flush()
    return activity
