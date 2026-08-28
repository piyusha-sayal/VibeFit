"""Deterministic Action Plan: turns the Vibe Profile (goals + constraints +
measured/reported attributes) into a small set of ranked, explainable
actions. Reuses the existing face-shape and body-guidance rule tables so the
plan stays grounded in the same rules that power `rules/engine.py`.

No step here calls an LLM. `services/plan_service.py` may pass the resulting
text through the AI service for tone-only rephrasing, but the ranking,
selection, and every fact quoted in `why` are decided here.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from models.analysis import Analysis
from schemas.profile import VibeProfileOut
from .face_shape_rules import guide_for
from .body_guidance import body_balance_tips

_CONFIDENCE_RANK = {
    "high": 0,
    "user_corrected": 1,
    "self_reported": 1,
    "usable_with_caution": 2,
    "unknown": 3,
    "retake_recommended": 4,
}

_UNDERTONE_TIPS = {
    "warm": {"colors": ["Earth tones", "Warm gold", "Olive", "Terracotta"], "metal": "Gold"},
    "cool": {"colors": ["Jewel tones", "Cool blue", "Berry", "Icy pastels"], "metal": "Silver"},
    "neutral": {"colors": ["Soft neutrals", "Muted jewel tones", "Balanced pastels"], "metal": "Gold or silver"},
}

_LOW_MAINTENANCE_HAIR_KEYWORDS = ("crop", "pixie", "short", "lob", "bob")


def _confidence_rank(label: str) -> int:
    return _CONFIDENCE_RANK.get(label, 3)


def _hair_maintenance(styles: list[str]) -> str:
    if any(any(k in s.lower() for k in _LOW_MAINTENANCE_HAIR_KEYWORDS) for s in styles):
        return "low"
    return "medium"


def _build_candidates(profile: VibeProfileOut, analysis: Optional[Analysis]) -> list[dict[str, Any]]:
    attrs = profile.attributes
    constraints = profile.constraints
    candidates: list[dict[str, Any]] = []

    face_shape_attr = attrs.get("face_shape")
    if face_shape_attr and face_shape_attr.value:
        shape = face_shape_attr.value
        g = guide_for(shape)
        candidates.append({
            "category": "hair", "area": "hair",
            "title": f"Hairstyles that suit your {shape} face shape",
            "why": f"Your face shape reads as {shape} in your latest scan. {g.summary}",
            "confidence_label": face_shape_attr.confidence,
            "limitations": face_shape_attr.limitations,
            "items": list(g.hairstyles),
            "maintenance": _hair_maintenance(g.hairstyles),
            "budget_tier": "low",
            "sensitive": False,
        })
        candidates.append({
            "category": "outfit", "area": "face",
            "title": "Necklines that balance your face shape",
            "why": f"These necklines echo the balance goals for a {shape} face: {', '.join(g.goals)}.",
            "confidence_label": face_shape_attr.confidence,
            "limitations": face_shape_attr.limitations,
            "items": list(g.necklines),
            "maintenance": "low", "budget_tier": "any", "sensitive": False,
        })
        candidates.append({
            "category": "accessory", "area": "face",
            "title": "Glasses and earring shapes for your face",
            "why": f"Frame and earring shapes chosen to complement a {shape} face.",
            "confidence_label": face_shape_attr.confidence,
            "limitations": face_shape_attr.limitations,
            "items": list(g.glasses) + list(g.earrings),
            "maintenance": "low", "budget_tier": "medium", "sensitive": False,
        })
        if g.avoid_hairstyles or g.avoid_necklines:
            candidates.append({
                "category": "styling", "area": "face",
                "title": f"Styles to postpone for a {shape} face",
                "why": "These tend to work against the balance goals above — not wrong, just lower-impact for this shape.",
                "confidence_label": face_shape_attr.confidence,
                "limitations": face_shape_attr.limitations,
                "items": list(g.avoid_hairstyles) + list(g.avoid_necklines),
                "maintenance": "low", "budget_tier": "any", "sensitive": False,
                "force_avoid": True,
            })

    undertone_attr = attrs.get("undertone")
    if undertone_attr and undertone_attr.value in _UNDERTONE_TIPS:
        tone = undertone_attr.value
        tip = _UNDERTONE_TIPS[tone]
        candidates.append({
            "category": "color", "area": "color",
            "title": f"A color palette for your {tone} undertone",
            "why": f"Your undertone reads as {tone}. {tip['metal']} jewelry and these palettes tend to complement it.",
            "confidence_label": undertone_attr.confidence,
            "limitations": undertone_attr.limitations,
            "items": tip["colors"],
            "maintenance": "low", "budget_tier": "low", "sensitive": False,
        })

    body_shape_attr = attrs.get("body_shape")
    if body_shape_attr and body_shape_attr.value:
        shape = body_shape_attr.value
        guide = body_balance_tips({"shape": shape})
        candidates.append({
            "category": "outfit", "area": "body",
            "title": "Fit and silhouette guidance for your proportions",
            "why": guide["balance"],
            "confidence_label": body_shape_attr.confidence,
            "limitations": body_shape_attr.limitations,
            "items": guide["fitNotes"],
            "maintenance": "low", "budget_tier": "any", "sensitive": False,
        })

    skin_texture_attr = attrs.get("skin_texture")
    skin_oiliness_attr = attrs.get("skin_oiliness")
    if skin_texture_attr and skin_texture_attr.value not in (None, "unknown"):
        texture = skin_texture_attr.value
        oiliness = skin_oiliness_attr.value if skin_oiliness_attr else None
        steps = ["Gentle cleanser, morning and night", "Daily SPF"]
        if texture == "textured":
            steps.append("A mild, low-frequency exfoliating step — start once a week")
        if oiliness == "shiny":
            steps.append("A lightweight, oil-free moisturizer")
        elif oiliness == "matte":
            steps.append("A richer moisturizer to support the skin barrier")
        candidates.append({
            "category": "skin", "area": "skin",
            "title": "A minimal starting routine",
            "why": f"Based on the visible texture ({texture}) and shine pattern observed in your scan photo — a cosmetic observation, not a diagnosis.",
            "confidence_label": skin_texture_attr.confidence,
            "limitations": (skin_texture_attr.limitations or "") +
                           " This is a routine suggestion, not a treatment for any skin condition — see a dermatologist for concerns that persist.",
            "items": steps,
            "maintenance": "low", "budget_tier": "low",
            "sensitive": "textured" in (texture or ""),
        })

    hair_texture_attr = attrs.get("hair_texture")
    if hair_texture_attr and hair_texture_attr.value not in (None, "unknown"):
        hair_block = (analysis.hair_analysis if analysis else None) or {}
        styles = [s for s in (hair_block.get("recommendedStyles") or []) if isinstance(s, str)]
        candidates.append({
            "category": "hair", "area": "hair",
            "title": f"Care and styling for {hair_texture_attr.value} hair",
            "why": f"Your hair reads as {hair_texture_attr.value} in your scan photo.",
            "confidence_label": hair_texture_attr.confidence,
            "limitations": hair_texture_attr.limitations,
            "items": styles or ["Ask your stylist for texture-specific product recommendations"],
            "maintenance": _hair_maintenance(styles) if styles else "medium",
            "budget_tier": "low", "sensitive": False,
        })

    return candidates


def _violates_constraints(candidate: dict[str, Any], constraints: dict[str, Any]) -> Optional[str]:
    sensitivities = constraints.get("skin_sensitivities") or []
    allergies = constraints.get("declared_allergies") or []
    if candidate.get("sensitive") and (sensitivities or allergies):
        return "You noted a skin sensitivity — start gently and patch-test before trying this."

    maintenance_tolerance = constraints.get("maintenance_tolerance")
    if maintenance_tolerance == "low" and candidate.get("maintenance") == "high":
        return "Higher maintenance than the level you said you prefer."

    budget_range = constraints.get("budget_range")
    if budget_range == "low" and candidate.get("budget_tier") == "high":
        return "Likely above the budget range you set."

    return None


def build_action_plan(profile: VibeProfileOut, analysis: Optional[Analysis]) -> dict[str, Any]:
    candidates = _build_candidates(profile, analysis)
    interests = set(profile.areas_of_interest or [])

    if interests:
        candidates = [c for c in candidates if c["area"] in interests]

    top_pool: list[dict[str, Any]] = []
    avoid_pool: list[dict[str, Any]] = []

    for c in candidates:
        if c.get("force_avoid"):
            avoid_pool.append(c)
            continue
        reason = _violates_constraints(c, profile.constraints)
        if reason:
            c = {**c, "why": f"{c['why']} Postponed: {reason}"}
            avoid_pool.append(c)
        else:
            top_pool.append(c)

    top_pool.sort(key=lambda c: _confidence_rank(c["confidence_label"]))
    top_actions = top_pool[:3]

    slow_categories = {"hair", "body"}
    days = 30 if any(a["category"] in slow_categories for a in top_actions) else 14
    check_in_at = datetime.now(timezone.utc) + timedelta(days=days)

    limitations_summary = None
    if not profile.has_scan and not profile.has_onboarding:
        limitations_summary = "No scan or profile answers yet — complete onboarding and a scan for a grounded plan."
    elif not profile.has_scan:
        limitations_summary = "No scan yet — this plan is based on your questionnaire answers only."
    elif any(a["confidence_label"] == "retake_recommended" for a in top_actions):
        limitations_summary = "Your last scan had low image quality — consider a retake for more reliable results."

    return {
        "goal": profile.goal,
        "top_actions": top_actions,
        "avoid": avoid_pool,
        "check_in_at": check_in_at,
        "generated_at": datetime.now(timezone.utc),
        "profile_complete": profile.has_scan and profile.has_onboarding,
        "limitations_summary": limitations_summary,
    }
