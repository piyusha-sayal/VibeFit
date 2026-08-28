"""Deterministic Action Plan ranking/filtering — pure functions, no DB/network."""
from datetime import datetime, timezone

from rules.action_plan_engine import build_action_plan, _violates_constraints
from schemas.profile import AttributeValueOut, VibeProfileOut


def _attr(value, confidence="high", source="scan"):
    return AttributeValueOut(value=value, original_value=None, confidence=confidence,
                              source=source, updated_at=datetime.now(timezone.utc),
                              explanation="test", limitations=None)


def _profile(attributes, constraints=None, goal=None, areas=None,
             has_scan=True, has_onboarding=True):
    return VibeProfileOut(
        user_id="u1", goal=goal, areas_of_interest=areas or [],
        constraints=constraints or {}, attributes=attributes,
        has_scan=has_scan, has_onboarding=has_onboarding,
    )


def test_empty_profile_yields_no_actions_and_explains_why():
    profile = _profile({}, has_scan=False, has_onboarding=False)
    plan = build_action_plan(profile, None)
    assert plan["top_actions"] == []
    assert plan["avoid"] == []
    assert "onboarding" in plan["limitations_summary"].lower() or "scan" in plan["limitations_summary"].lower()


def test_face_shape_drives_grounded_top_action():
    profile = _profile({"face_shape": _attr("round")}, goal="haircut")
    plan = build_action_plan(profile, None)
    assert plan["top_actions"]
    titles = [a["title"] for a in plan["top_actions"]]
    assert any("round" in t for t in titles)
    assert all("round" in a["why"] or "balance" in a["why"].lower() for a in plan["top_actions"])


def test_avoid_list_includes_face_shape_styles_to_postpone():
    profile = _profile({"face_shape": _attr("round")})
    plan = build_action_plan(profile, None)
    assert any("postpone" in a["title"].lower() for a in plan["avoid"])


def test_top_actions_capped_at_three():
    profile = _profile({
        "face_shape": _attr("oval"),
        "undertone": _attr("warm"),
        "body_shape": _attr("hourglass"),
    })
    plan = build_action_plan(profile, None)
    assert len(plan["top_actions"]) <= 3


def test_areas_of_interest_filters_candidates():
    profile = _profile(
        {"face_shape": _attr("oval"), "undertone": _attr("cool"), "body_shape": _attr("pear")},
        areas=["color"],
    )
    plan = build_action_plan(profile, None)
    assert plan["top_actions"]
    assert all(a["category"] == "color" for a in plan["top_actions"])


def test_check_in_extends_to_30_days_for_hair_or_body_actions():
    profile = _profile({"face_shape": _attr("oval")}, areas=["hair"])
    plan = build_action_plan(profile, None)
    delta_days = (plan["check_in_at"] - plan["generated_at"]).days
    assert delta_days == 30


def test_check_in_stays_14_days_without_slow_categories():
    profile = _profile({"undertone": _attr("warm")}, areas=["color"])
    plan = build_action_plan(profile, None)
    delta_days = (plan["check_in_at"] - plan["generated_at"]).days
    assert delta_days == 14


def test_correction_still_grounds_a_traceable_action():
    profile = _profile({"face_shape": _attr("heart", confidence="user_corrected", source="user_correction")})
    plan = build_action_plan(profile, None)
    assert plan["top_actions"]
    assert plan["top_actions"][0]["confidence_label"] == "user_corrected"


def test_violates_constraints_flags_sensitivity():
    candidate = {"sensitive": True, "maintenance": "low", "budget_tier": "low"}
    reason = _violates_constraints(candidate, {"skin_sensitivities": ["fragrance"]})
    assert reason and "sensitiv" in reason.lower()


def test_violates_constraints_flags_maintenance_mismatch():
    candidate = {"sensitive": False, "maintenance": "high", "budget_tier": "low"}
    reason = _violates_constraints(candidate, {"maintenance_tolerance": "low"})
    assert reason and "maintenance" in reason.lower()


def test_violates_constraints_flags_budget_mismatch():
    candidate = {"sensitive": False, "maintenance": "low", "budget_tier": "high"}
    reason = _violates_constraints(candidate, {"budget_range": "low"})
    assert reason and "budget" in reason.lower()


def test_violates_constraints_passes_when_compatible():
    candidate = {"sensitive": False, "maintenance": "low", "budget_tier": "low"}
    reason = _violates_constraints(candidate, {"maintenance_tolerance": "low", "budget_range": "low"})
    assert reason is None


def test_sensitivity_moves_skin_candidate_to_avoid_with_reason():
    profile = _profile(
        {"skin_texture": _attr("textured"), "skin_oiliness": _attr("shiny")},
        constraints={"skin_sensitivities": ["fragrance"]},
        areas=["skin"],
    )
    plan = build_action_plan(profile, None)
    assert not plan["top_actions"]
    assert plan["avoid"]
    assert "sensitiv" in plan["avoid"][0]["why"].lower()
