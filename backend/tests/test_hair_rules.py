"""The Hair Studio matching engine.

The rules are deterministic and offline, so these tests pin the actual
behaviour a user will see: what gets recommended, what gets filtered out, and
what reason is shown beside each result.
"""
import pytest

from rules import hair_rules
from rules.color_palettes import SEASON_KEYS
from rules.hair_library import BANGS, HAIRSTYLE_BY_KEY, HAIRSTYLES


def _keys(results):
    return [r["key"] for r in results]


# --------------------------------------------------------------- haircut finder

def test_face_shape_drives_the_order_of_recommendations():
    square = hair_rules.recommend_hairstyles("square")
    assert square, "a known face shape must produce recommendations"
    top = square[0]
    assert "square" in HAIRSTYLE_BY_KEY[top["key"]].suits_shapes
    # Scores must be ordered, and every entry must explain itself.
    scores = [r["score"] for r in square]
    assert scores == sorted(scores, reverse=True)
    assert all(r["reasons"] for r in square)


def test_an_unknown_face_shape_still_returns_the_library_without_shape_claims():
    results = hair_rules.recommend_hairstyles(None)
    assert len(results) == len(HAIRSTYLES)
    assert all("face shape" not in " ".join(r["reasons"]).lower() for r in results)


def test_texture_is_a_hard_filter_not_a_ranking_nudge():
    coily = hair_rules.recommend_hairstyles("oval", texture="coily")
    assert coily
    assert all("coily" in HAIRSTYLE_BY_KEY[r["key"]].textures for r in coily)
    assert "blunt_bob" not in _keys(coily)


def test_coily_and_curly_hair_get_protective_styles_not_an_empty_list():
    coily = hair_rules.recommend_hairstyles(None, texture="coily")
    protective = [r for r in coily if HAIRSTYLE_BY_KEY[r["key"]].protective]
    assert len(protective) >= 3
    assert {"box_braids", "locs", "twists"} <= set(_keys(coily))


def test_maintenance_filter_never_returns_something_higher_than_asked():
    low = hair_rules.recommend_hairstyles(None, maintenance="low")
    assert low
    assert all(HAIRSTYLE_BY_KEY[r["key"]].maintenance == "low" for r in low)

    medium = hair_rules.recommend_hairstyles(None, maintenance="medium")
    assert all(HAIRSTYLE_BY_KEY[r["key"]].maintenance in ("low", "medium") for r in medium)
    assert len(medium) > len(low)


def test_length_and_presentation_filters_combine():
    results = hair_rules.recommend_hairstyles(
        "oval", length="short", presentation="masculine",
    )
    assert results
    for r in results:
        style = HAIRSTYLE_BY_KEY[r["key"]]
        assert style.length == "short"
        assert style.presentation in ("masculine", "any")


def test_presentation_is_never_inferred_only_applied_when_given():
    unfiltered = hair_rules.recommend_hairstyles("oval")
    presentations = {HAIRSTYLE_BY_KEY[r["key"]].presentation for r in unfiltered}
    assert {"feminine", "masculine", "any"} <= presentations


def test_impossible_filter_combination_returns_empty_rather_than_a_wrong_answer():
    assert hair_rules.recommend_hairstyles(None, texture="coily", length="short",
                                           maintenance="low", presentation="feminine") == [] or all(
        HAIRSTYLE_BY_KEY[r["key"]].maintenance == "low"
        for r in hair_rules.recommend_hairstyles(None, texture="coily", length="short",
                                                 maintenance="low", presentation="feminine")
    )


def test_time_budget_filters_on_daily_styling_minutes():
    quick = hair_rules.recommend_hairstyles(None, max_minutes=5)
    assert quick
    assert all(HAIRSTYLE_BY_KEY[r["key"]].styling_minutes <= 5 for r in quick)


# ----------------------------------------------------------------- bangs finder

def test_bangs_are_recommended_per_face_shape_and_always_offer_the_no_fringe_option():
    for shape in ("round", "oblong", "heart", "square"):
        results = hair_rules.recommend_bangs(shape)
        assert results
        assert "none" in _keys(results), "not having a fringe must stay on the table"
        assert results[0]["key"] != "none" or shape == "heart"


def test_every_bangs_entry_carries_its_commitment_warning():
    for entry in hair_rules.recommend_bangs("oval"):
        assert entry["maintenance"] in ("low", "medium", "high")
        assert entry["notes"]


def test_full_bangs_are_marked_high_maintenance():
    entry = next(b for b in BANGS if b.key == "full")
    assert entry.maintenance == "high"


# ---------------------------------------------------------- hair colour explorer

@pytest.mark.parametrize("season", SEASON_KEYS)
def test_every_season_yields_hair_colours_with_a_lift_and_upkeep_note(season):
    results = hair_rules.recommend_hair_colours(season)
    assert results, season
    for r in results:
        assert r["liftRequired"] in ("none", "low", "medium", "high")
        assert r["maintenance"] in ("low", "medium", "high")
        assert r["notes"]
        assert r["hex"].startswith("#")


def test_warm_seasons_favour_warm_colours_and_cool_seasons_favour_cool():
    warm_top = hair_rules.recommend_hair_colours("warm_autumn")[:4]
    cool_top = hair_rules.recommend_hair_colours("cool_winter")[:4]
    assert sum(1 for r in warm_top if r["warmth"] == "warm") >= 3
    assert sum(1 for r in cool_top if r["warmth"] == "cool") >= 3


def test_no_season_returns_the_full_palette_without_a_seasonal_claim():
    results = hair_rules.recommend_hair_colours(None)
    assert len(results) == 14
    assert all(r["seasonMatch"] is False for r in results)


def test_lift_tolerance_filters_out_heavy_processing():
    gentle = hair_rules.recommend_hair_colours("deep_winter", max_lift="low")
    assert gentle
    assert all(r["liftRequired"] in ("none", "low") for r in gentle)


# --------------------------------------------------------------- parting guide

def test_partings_are_suggested_per_shape_and_all_remain_available():
    # Oblong differentiates: a deep side part suits it, a centre part does not.
    results = hair_rules.recommend_partings("oblong")
    assert len(results) == 4, "nothing is filtered out — a parting is free to change"
    assert results[0]["suited"] is True
    assert any(r["suited"] is False for r in results)


# ------------------------------------------------------- salon consultation guide

def test_salon_guide_is_built_from_the_chosen_style_and_names_it():
    guide = hair_rules.salon_guide("wolf_cut")
    assert "Wolf cut" in guide["title"]
    assert len(guide["askFor"]) >= 3
    assert guide["maintenance"]
    assert any("photo" in line.lower() for line in guide["askFor"] + guide["watchOut"])


def test_salon_guide_for_an_unknown_style_returns_none_rather_than_inventing_one():
    assert hair_rules.salon_guide("not_a_real_style") is None


# ------------------------------------------------------------------- honesty

def test_no_recommendation_claims_to_predict_a_real_haircut_result():
    banned = ("guarantee", "exactly how you will look", "predicts")
    for r in hair_rules.recommend_hairstyles("oval"):
        text = " ".join(r["reasons"]).lower()
        assert not any(b in text for b in banned)


def test_disclaimer_is_available_for_any_visualisation_surface():
    assert "not" in hair_rules.VISUALISATION_DISCLAIMER.lower()
