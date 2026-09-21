"""Discover My Style rules: the library, aesthetics, outfits and colour pairings."""
import pytest

from rules import outfit_colors, outfit_rules, style_aesthetics
from rules.fashion_library import (
    BODY_TYPES, CATEGORIES, GARMENTS, GLOBAL, INDIAN, by_category, by_region,
)


# ----------------------------------------------------------------- library

def test_the_library_covers_every_category_with_real_content():
    for category in CATEGORIES:
        entries = by_category(category)
        assert entries, category
        for garment in entries:
            assert garment.description and garment.styling
            assert garment.silhouette and garment.fit and garment.formality
            assert garment.occasions and garment.climates


def test_indian_and_global_garments_live_in_one_library():
    assert len(INDIAN) >= 15
    assert len(GLOBAL) >= 25
    # Every Indian garment is reachable without filtering to a region.
    keys = {g.key for g in GARMENTS}
    for required in ("saree_silk", "lehenga_aline", "anarkali", "kurta_straight",
                     "salwar_suit", "sharara", "gharara", "sherwani", "nehru_jacket",
                     "indo_western"):
        assert required in keys, required


def test_global_categories_are_all_represented():
    keys = {g.key for g in GARMENTS}
    for required in ("tshirt", "button_shirt", "straight_jeans", "high_waist_trousers",
                     "aline_skirt", "wrap_dress", "blazer_tailored", "trench",
                     "athleisure_set", "modest_maxi"):
        assert required in keys, required


def test_region_filter_includes_shared_garments_in_both_directions():
    indian = {g.key for g in by_region("indian")}
    globals_ = {g.key for g in by_region("global")}
    # Palazzos are worn in both traditions, so they appear under each.
    assert "palazzo" in indian and "palazzo" in globals_
    assert "saree_silk" in indian and "saree_silk" not in globals_


# -------------------------------------------------------------- body types

def test_body_type_options_include_both_opt_outs():
    assert "unsure" in BODY_TYPES
    assert "uncategorised" in BODY_TYPES
    assert outfit_rules.valid_body_type("unsure")
    assert not outfit_rules.valid_body_type("banana")


@pytest.mark.parametrize("body_type", [b for b in BODY_TYPES])
def test_every_body_type_has_a_note_that_does_not_rank_bodies(body_type):
    note = outfit_rules.BODY_NOTES[body_type]
    assert note
    for banned in ("flatter", "hide", "slim", "problem", "flaw", "unflattering", "avoid"):
        assert banned not in note.lower(), banned


def test_body_type_orders_results_and_never_hides_a_garment():
    everything = outfit_rules.recommend_garments()
    for body_type in BODY_TYPES:
        ranked = outfit_rules.recommend_garments(body_type=body_type)
        assert len(ranked) == len(everything), body_type


def test_a_body_type_actually_changes_the_order():
    pear = [g["key"] for g in outfit_rules.recommend_garments(body_type="pear")]
    inverted = [g["key"] for g in outfit_rules.recommend_garments(body_type="inverted_triangle")]
    assert pear != inverted


# ------------------------------------------------------------- aesthetics

def test_sixteen_aesthetics_are_offered_to_everyone():
    assert len(style_aesthetics.AESTHETICS) == 16
    names = {a.name for a in style_aesthetics.AESTHETICS}
    for required in ("Minimalist", "Classic", "Elegant", "Contemporary", "Streetwear",
                     "Casual", "Romantic", "Vintage", "Preppy", "Business Casual",
                     "Formal", "Athleisure", "Indo-Western", "Traditional",
                     "Korean-Inspired", "Modest Fashion"):
        assert required in names, required


def test_every_aesthetic_names_real_garments():
    keys = {g.key for g in GARMENTS}
    for aesthetic in style_aesthetics.AESTHETICS:
        assert aesthetic.hero_garments
        for garment_key in aesthetic.hero_garments:
            assert garment_key in keys, f"{aesthetic.key} -> {garment_key}"


def test_the_quiz_ranks_without_forcing_one_category():
    ranked = style_aesthetics.score_quiz({
        "outfits": ["saree", "kurta_jeans"],
        "fit": "relaxed",
        "occasions": ["festive"],
    })
    assert len(ranked) == 16, "every aesthetic comes back, scored"
    top = [r["key"] for r in ranked[:3]]
    assert "traditional" in top or "indo_western" in top
    assert sum(1 for r in ranked if r["score"] > 0) > 1, "never a single winner"


def test_a_half_finished_quiz_still_ranks():
    ranked = style_aesthetics.score_quiz({"fit": "oversized"})
    assert ranked[0]["score"] > 0
    assert ranked[0]["key"] == "streetwear"


def test_an_empty_quiz_suggests_nothing_rather_than_guessing():
    assert style_aesthetics.top_aesthetics({}) == []
    assert all(r["score"] == 0 for r in style_aesthetics.score_quiz({}))


def test_unknown_answers_are_ignored_not_fatal():
    ranked = style_aesthetics.score_quiz({"outfits": ["not_an_option"], "nope": "x"})
    assert all(r["score"] == 0 for r in ranked)


# ---------------------------------------------------------------- outfits

def test_outfits_work_with_a_completely_empty_profile():
    outfits = outfit_rules.build_outfits()
    assert len(outfits) >= 4
    for outfit in outfits:
        assert outfit["pieces"], outfit["key"]
        assert outfit["summary"]


def test_every_returned_outfit_has_every_piece_it_needs():
    for occasion in ("work", "wedding", "everyday", "festival", None):
        for outfit in outfit_rules.build_outfits(occasion=occasion):
            concept = next(c for c in outfit_rules.OUTFIT_CONCEPTS if c["key"] == outfit["key"])
            assert len(outfit["pieces"]) == len(concept["roles"])


def test_a_user_who_declines_body_type_still_gets_recommendations():
    declined = outfit_rules.build_outfits(aesthetics=["Minimalist"], occasion="work")
    assert declined
    assert all(o["pieces"] for o in declined)


def test_colour_comes_from_the_season_engine_and_is_empty_without_one():
    with_season = outfit_rules.build_outfits(occasion="wedding", season="deep_winter")
    assert with_season[0]["colours"]["main"], "a season fills the palette"
    assert with_season[0]["colours"]["seasonLabel"] == "Deep Winter"

    without = outfit_rules.build_outfits(occasion="wedding")
    assert without[0]["colours"]["main"] == []
    assert without[0]["colours"]["season"] is None


def test_outfits_offer_alternatives_so_nothing_reads_as_the_only_answer():
    outfits = outfit_rules.build_outfits(occasion="work")
    assert any(o["alternatives"] for o in outfits)


def test_traditional_and_western_outfits_are_both_reachable_for_the_same_user():
    festive = outfit_rules.build_outfits(occasion="festival")
    work = outfit_rules.build_outfits(occasion="work")
    festive_regions = {p["region"] for o in festive for p in o["pieces"]}
    work_regions = {p["region"] for o in work for p in o["pieces"]}
    # Indian garments lead at a festival, Western ones at work — and neither
    # list was filtered by anything the user was assumed to be.
    assert "indian" in festive_regions
    assert "global" in work_regions


def test_cultural_preference_is_never_inferred_only_applied():
    # With no stated preference, both traditions appear in the unfiltered library.
    garments = outfit_rules.recommend_garments()
    regions = {g["region"] for g in garments}
    assert {"indian", "global", "both"} <= regions


# ---------------------------------------------------------- outfit colours

def test_neutrals_are_detected_by_chroma_not_saturation():
    # Ivory: high saturation, very high lightness — a neutral in practice.
    assert outfit_colors.is_neutral("#f2ece3")
    assert outfit_colors.is_neutral("#ffffff")
    assert not outfit_colors.is_neutral("#c62828")


@pytest.mark.parametrize("a,b,expected", [
    ("#c62828", "#8e1c1c", "monochromatic"),
    ("#c62828", "#c68a28", "analogous"),
    ("#c62828", "#28c6a0", "complementary"),
    ("#c62828", "#f5f2ea", "neutral"),
])
def test_clothing_colour_relationships_are_named_correctly(a, b, expected):
    assert outfit_colors.describe_pair(a, b)["harmony"] == expected


def test_indian_and_global_pairings_are_both_offered():
    keys = {p["key"] for p in outfit_colors.PAIRINGS}
    assert {"saree_blouse", "lehenga_dupatta", "kurta_trouser"} <= keys
    assert {"shirt_trouser", "suit_shirt", "dress_accessory"} <= keys


def test_pairings_teach_by_leading_with_different_harmonies():
    result = outfit_colors.pairing_suggestions("saree_blouse", "deep_winter", limit=4)
    harmonies = [s["harmony"] for s in result["suggestions"]]
    assert len(set(harmonies)) >= 3, harmonies


def test_a_pairing_without_a_season_returns_no_invented_colours():
    result = outfit_colors.pairing_suggestions("shirt_trouser", None)
    assert result["suggestions"] == []
    assert result["palette"] == []
    assert result["name"]


def test_unknown_pairing_returns_none():
    assert outfit_colors.pairing_suggestions("hat_and_socks", "deep_winter") is None
