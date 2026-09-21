"""Makeup Studio and Accessories Explorer rules."""
import pytest

from rules import accessories_rules, makeup_rules
from rules.accessories_library import EARRINGS, METALS
from rules.makeup_library import AESTHETICS, FOUNDATION_GUIDE


# ------------------------------------------------------------------- makeup

def test_the_library_covers_fourteen_aesthetics_without_one_tradition_dominating():
    assert len(AESTHETICS) == 14
    korean = [a for a in AESTHETICS if a.origin == "korean"]
    indian = [a for a in AESTHETICS if a.origin == "indian"]
    assert 0 < len(korean) <= 3, "Korean-inspired looks are included but do not dominate"
    assert len(indian) >= 2, "Indian occasion makeup is a first-class part of the library"


def test_occasion_and_time_are_hard_filters():
    work = makeup_rules.recommend_aesthetics(occasion="work", max_minutes=10)
    assert work
    for entry in work:
        assert "work" in entry["occasions"]
        assert entry["minutes"] <= 10


def test_facial_contrast_moves_intensity_not_availability():
    soft = makeup_rules.recommend_aesthetics(contrast="soft")
    defined = makeup_rules.recommend_aesthetics(contrast="defined")
    assert len(soft) == len(defined) == len(AESTHETICS)
    assert soft[0]["intensity"] in ("bare", "soft")
    assert defined[0]["intensity"] in ("defined", "bold")


def test_a_look_uses_confirmed_attributes_for_technique():
    look = makeup_rules.build_look(
        "soft_glam",
        season="deep_winter",
        attributes={"eye_shape": "hooded", "lip_shape": "thin", "facial_contrast": "defined"},
        occasion="evening",
    )
    keys = {t["key"] for t in look["techniques"]}
    assert "hooded_lid" in keys
    assert "thin_lip_fullness" in keys
    assert all(t["basedOnValue"] for t in look["techniques"])


def test_unset_attributes_are_named_rather_than_filled_with_generic_advice():
    look = makeup_rules.build_look("natural", attributes={"eye_shape": "almond"})
    assert "lip_shape" in look["missingAttributes"]
    assert "cheek_contour" in look["missingAttributes"]
    assert all(t["basedOn"] != "lip_shape" for t in look["techniques"])


def test_look_colours_come_from_the_season_engine_not_a_separate_list():
    from rules.color_palettes import SEASONS
    look = makeup_rules.build_look("festive_indian", season="warm_autumn")
    assert look["palette"]["lipstick"] == list(SEASONS["warm_autumn"]["lipstick"])
    assert look["palette"]["seasonLabel"] == SEASONS["warm_autumn"]["label"]


def test_a_look_without_a_season_carries_no_colour_claim():
    look = makeup_rules.build_look("natural")
    assert look["palette"]["lipstick"] == []
    assert look["palette"]["season"] is None


def test_unknown_aesthetic_returns_none():
    assert makeup_rules.build_look("not_an_aesthetic") is None


def test_foundation_guidance_names_families_and_refuses_exact_shades():
    look = makeup_rules.build_look("office", undertone="olive")
    assert look["foundation"]["shadeFamily"]
    assert "does not match specific products" in FOUNDATION_GUIDE["disclaimer"]
    assert "exact foundation shades" in look["foundation"]["disclaimer"]


# -------------------------------------------------------------- accessories

@pytest.mark.parametrize("category", ["glasses", "earrings", "necklines", "hair_accessories"])
def test_nothing_is_filtered_away_by_face_shape(category):
    with_shape = accessories_rules.recommend(category, "heart")
    without = accessories_rules.recommend(category, None)
    assert len(with_shape) == len(without)
    assert with_shape[0]["score"] >= with_shape[-1]["score"]


def test_suited_items_lead_and_the_rest_stay_visible():
    results = accessories_rules.recommend("glasses", "square")
    assert results[0]["suited"] is True
    assert any(r["suited"] is False for r in results)


def test_indian_jewellery_is_present_and_not_segregated_by_default():
    earrings = accessories_rules.recommend("earrings", "oblong")
    keys = [r["key"] for r in earrings]
    assert "jhumka" in keys and "chandbali" in keys
    # And a jhumka can outrank a Western form when it actually suits better.
    assert keys.index("jhumka") < keys.index("studs")


def test_origin_filter_is_available_without_being_the_default():
    indian = accessories_rules.recommend("earrings", None, origin="indian")
    assert {r["key"] for r in indian} == {
        e.key for e in EARRINGS if e.origin == "indian"
    }
    assert len(indian) < len(accessories_rules.recommend("earrings", None))


def test_metals_follow_undertone_but_both_remain_listed():
    warm = accessories_rules.recommend_metals("warm")
    assert len(warm) == len(METALS)
    assert warm[0]["warmth"] in ("warm", "neutral")
    assert any(m["warmth"] == "cool" for m in warm)


def test_metals_fall_back_to_the_season_family_when_undertone_is_unknown():
    winter = accessories_rules.recommend_metals(None, season_family="winter")
    assert winter[0]["warmth"] in ("cool", "neutral")


def test_metals_make_no_claim_when_nothing_is_known():
    unknown = accessories_rules.recommend_metals(None)
    assert all(m["suited"] is False for m in unknown)


def test_unknown_category_returns_empty():
    assert accessories_rules.recommend("shoes", "oval") == []


def test_all_categories_bundles_every_surface():
    bundle = accessories_rules.all_categories("diamond", undertone="cool")
    for key in ("glasses", "earrings", "necklines", "hairAccessories", "metals"):
        assert bundle[key], key
