"""The Look Composition engine, without the database.

These assert the product properties, not the implementation: that a look can
always be built, that nothing is invented, and that changing one component
leaves the rest of the look exactly where it was.
"""
import pytest

from rules import look_composer as lc
from rules.color_season import build_color_report
from rules.fashion_library import GARMENT_BY_KEY
from rules.look_structures import OCCASION_KEYS, STRUCTURES, STRUCTURE_BY_KEY


def _report():
    return build_color_report({
        "skinUndertone": "warm", "season": "autumn", "seasonConfidence": 0.8,
        "skinDepth": "medium",
    })


def _full_context() -> dict:
    report = _report()
    return {
        "season": report["season"], "seasonLabel": report["label"],
        "seasonFamily": report["family"], "undertone": "warm",
        "palettes": report["palettes"],
        "faceShape": "oval", "hairTexture": "wavy", "contrast": "medium",
        "attributes": {"eye_shape": "almond", "lip_shape": "full"},
        "bodyType": "pear", "effectiveBodyType": "pear",
        "aesthetics": ["Minimalist", "Traditional"], "silhouettes": ["a_line"],
        "fitPreference": "relaxed", "cultural": [], "climate": None,
        "used": ["Colour analysis"], "missing": [],
    }


# ------------------------------------------------------------- level 1: quick

def test_a_look_can_be_built_with_no_profile_at_all():
    looks = lc.generate({}, occasion="office", limit=3)

    assert looks, "an empty profile must still produce looks"
    assert all(look["personalisation"] == "quick" for look in looks)
    assert all(look["outfit"]["pieces"] for look in looks)


def test_an_empty_profile_produces_no_invented_colours():
    look = lc.generate({}, occasion="party", limit=1)[0]

    assert look["colours"]["best"] == []
    assert look["colours"]["note"] == lc.NO_PALETTE_NOTE
    assert all(piece["colour"] is None for piece in look["outfit"]["pieces"])
    assert look["lipstick"]["offered"] is False
    assert look["hairColour"]["offered"] is False


def test_every_occasion_produces_at_least_one_complete_look():
    for occasion in OCCASION_KEYS:
        looks = lc.generate({}, occasion=occasion, limit=1)
        assert looks, occasion
        required = [s for s in STRUCTURE_BY_KEY[looks[0]["structure"]].slots if s.required]
        filled = {p["slot"] for p in looks[0]["outfit"]["pieces"]}
        assert {s.slot for s in required} <= filled, occasion


# -------------------------------------------------------- level 2 and level 3

def test_a_full_profile_reports_full_personalisation_and_real_colours():
    look = lc.compose("saree_set", _full_context(), occasion="indian_wedding")

    assert look["personalisation"] == "full"
    assert look["colours"]["seasonLabel"] == "Warm Autumn"
    assert all(piece["colour"] for piece in look["outfit"]["pieces"])
    assert look["lipstick"]["offered"] is True


def test_explanations_distinguish_analysis_from_occasion_defaults():
    personal = lc.compose("saree_set", _full_context(), occasion="wedding")
    anonymous = lc.compose("saree_set", {}, occasion="wedding")

    personal_bases = {e["basis"] for e in personal["explanations"]}
    anonymous_bases = {e["basis"] for e in anonymous["explanations"]}

    assert lc.BASIS_PERSONAL_COLOUR in personal_bases
    assert lc.BASIS_PERSONAL_COLOUR not in anonymous_bases
    assert lc.BASIS_OCCASION in anonymous_bases


def test_a_body_type_opt_out_never_produces_body_reasoning():
    context = {**_full_context(), "bodyType": "uncategorised", "effectiveBodyType": None}
    look = lc.compose("dress_look", context, occasion="date")

    body_explanations = [
        e for e in look["explanations"]
        if "shape you selected" in e["text"] or "body" in e["text"].lower()
    ]
    assert body_explanations == []
    assert look["outfit"]["pieces"], "opting out must not empty the look"


# ------------------------------------------------------------ flexible shapes

def test_a_saree_is_not_forced_into_a_top_and_bottom_schema():
    saree = STRUCTURE_BY_KEY["saree_set"]
    jeans = STRUCTURE_BY_KEY["top_jeans"]

    assert {s.slot for s in saree.slots} != {s.slot for s in jeans.slots}
    assert "bottom" not in {s.slot for s in saree.slots}
    assert "dupatta" in {s.slot for s in STRUCTURE_BY_KEY["lehenga_set"].slots}


def test_every_structure_slot_resolves_against_the_real_library():
    for structure in STRUCTURES:
        for slot in structure.slots:
            for key in slot.garment_keys:
                assert key in GARMENT_BY_KEY, f"{structure.key}.{slot.slot} -> {key}"


def test_both_traditions_are_offered_when_no_preference_is_stated():
    regions = {STRUCTURE_BY_KEY[look["structure"]].region
               for look in lc.generate({}, occasion="festival", limit=6)}
    assert regions, "festival must return something"
    assert lc.generate({}, occasion="office", regions=["global"], limit=3)
    assert all(
        STRUCTURE_BY_KEY[look["structure"]].region == "global"
        for look in lc.generate({}, occasion="office", regions=["global"], limit=3)
    )


# ------------------------------------------------------- component swapping

@pytest.mark.parametrize("component,selection,check", [
    ("hair", {"key": "long_layers"}, lambda look: look["hair"]["style"] == "long_layers"),
    ("makeup", {"key": "smokey"}, lambda look: look["makeup"]["aesthetic"] == "smokey"),
    ("jewellery", {"kind": "metal", "key": "silver"},
     lambda look: look["jewellery"]["metal"] == "silver"),
    ("jewellery", {"kind": "earrings", "key": "jhumka"},
     lambda look: look["jewellery"]["earrings"] == "jhumka"),
    ("accessories", {"key": "claw_clip"},
     lambda look: look["accessories"][0]["key"] == "claw_clip"),
    ("lipstick", {"key": "#800020", "name": "Burgundy"},
     lambda look: look["lipstick"]["hex"] == "#800020"),
])
def test_replacing_one_component_changes_only_that_component(component, selection, check):
    look = lc.compose("saree_set", _full_context(), occasion="wedding")
    updated = lc.apply_selection(look, component, selection)

    assert check(updated)
    untouched = [c for c in ("outfit", "hair", "makeup", "jewellery", "accessories", "lipstick")
                 if c != component]
    for key in untouched:
        assert updated[key] == look[key], f"{component} swap disturbed {key}"


def test_replacing_a_garment_keeps_every_other_slot():
    look = lc.compose("shirt_trouser", _full_context(), occasion="office")
    before = {p["slot"]: p["key"] for p in look["outfit"]["pieces"]}

    updated = lc.apply_selection(look, "outfit", {"slot": "bottom", "key": "wide_trousers"})
    after = {p["slot"]: p["key"] for p in updated["outfit"]["pieces"]}

    assert after["bottom"] == "wide_trousers"
    assert {k: v for k, v in after.items() if k != "bottom"} == \
           {k: v for k, v in before.items() if k != "bottom"}
    assert updated["hair"] == look["hair"]


def test_changing_a_colour_updates_the_harmony_note():
    look = lc.compose("lehenga_set", _full_context(), occasion="indian_wedding")
    new_colour = {"name": "Teal", "hex": "#2f7f79", "role": "best"}

    first_slot = look["outfit"]["pieces"][0]["slot"]
    updated = lc.apply_selection(look, "colours", {"slot": first_slot, "colour": new_colour})

    assert updated["outfit"]["pieces"][0]["colour"] == new_colour
    assert updated["colours"]["harmony"] != look["colours"]["harmony"]


def test_an_unknown_selection_leaves_the_look_untouched():
    look = lc.compose("dress_look", _full_context(), occasion="date")

    assert lc.apply_selection(look, "hair", {"key": "not-a-real-cut"}) == look
    assert lc.apply_selection(look, "outfit", {"slot": "main", "key": "nope"}) == look


def test_composing_is_deterministic():
    context = _full_context()
    assert lc.compose("saree_set", context, occasion="wedding") == \
           lc.compose("saree_set", context, occasion="wedding")


# ------------------------------------------------------------ smart variations

def test_a_makeup_shift_changes_makeup_and_nothing_else():
    look = lc.compose("lehenga_set", _full_context(), occasion="indian_wedding")
    softer = lc.shift(look, _full_context(), "softer_makeup")

    assert softer["outfit"] == look["outfit"]
    assert softer["hair"] == look["hair"]
    assert softer["makeup"]["intensity"] != look["makeup"]["intensity"]


def test_a_hair_shift_changes_hair_and_nothing_else():
    look = lc.compose("shirt_trouser", _full_context(), occasion="office")
    other = lc.shift(look, _full_context(), "new_hair")

    assert other["hair"]["style"] != look["hair"]["style"]
    assert other["outfit"] == look["outfit"]
    assert other["makeup"] == look["makeup"]


def test_a_formality_shift_keeps_the_users_own_hair_and_makeup():
    look = lc.compose("shirt_trouser", _full_context(), occasion="office")
    casual = lc.shift(look, _full_context(), "more_casual")

    assert casual["hair"] == look["hair"]
    assert casual["makeup"] == look["makeup"]
    assert casual["jewellery"] == look["jewellery"]


def test_rotating_colours_without_a_palette_changes_nothing():
    look = lc.compose("top_jeans", {}, occasion="everyday")
    assert lc.shift(look, {}, "new_colours") == look


# ----------------------------------------------------------------- rejection

def test_a_rejected_garment_is_demoted_but_never_removed():
    context = _full_context()
    plain = lc.compose("shirt_trouser", context, occasion="office")
    top_key = next(p["key"] for p in plain["outfit"]["pieces"] if p["slot"] == "top")

    with_rejection = lc.compose("shirt_trouser", context, occasion="office",
                                rejected={top_key})
    new_top = next(p["key"] for p in with_rejection["outfit"]["pieces"] if p["slot"] == "top")

    assert new_top != top_key
    assert any(option["key"] == top_key
               for option in lc.alternatives("outfit", plain, context, slot="top"))


# -------------------------------------------------------------- alternatives

def test_alternatives_are_offered_for_every_component():
    look = lc.compose("saree_set", _full_context(), occasion="wedding")
    for component in lc.COMPONENTS:
        slot = "drape" if component == "outfit" else None
        options = lc.alternatives(component, look, _full_context(), slot=slot)
        assert options, f"no alternatives offered for {component}"


def test_hair_alternatives_carry_the_visualisation_disclaimer():
    look = lc.compose("dress_look", _full_context(), occasion="party")
    assert "not a prediction" in look["hair"]["disclaimer"]


def test_no_lipstick_or_hair_colour_is_offered_without_a_colour_analysis():
    assert lc.alternatives("lipstick", lc.compose("dress_look", {}), {}) == []
    assert lc.alternatives("hairColour", lc.compose("dress_look", {}), {}) == []
