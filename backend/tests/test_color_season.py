"""The twelve-season classifier is deterministic, so it is tested directly."""
from rules.color_season import build_color_report, classify_season
from rules.color_palettes import SEASONS


def _metrics(**over):
    base = {"undertone": "warm", "depth": "medium", "chroma": "bright", "contrast": "medium"}
    base.update(over)
    return base


def test_warm_and_bright_lands_in_spring():
    result = classify_season(**_metrics())
    assert SEASONS[result.season]["family"] == "spring"
    assert result.season == "warm_spring"


def test_light_depth_moves_spring_to_light_spring():
    assert classify_season(**_metrics(depth="light")).season == "light_spring"


def test_high_contrast_moves_spring_to_bright_spring():
    assert classify_season(**_metrics(contrast="high")).season == "bright_spring"


def test_cool_and_muted_lands_in_summer():
    result = classify_season(**_metrics(undertone="cool", chroma="muted"))
    assert SEASONS[result.season]["family"] == "summer"


def test_cool_and_bright_lands_in_winter():
    result = classify_season(**_metrics(undertone="cool", chroma="bright", contrast="high"))
    assert SEASONS[result.season]["family"] == "winter"


def test_warm_and_muted_lands_in_autumn():
    result = classify_season(**_metrics(chroma="muted"))
    assert SEASONS[result.season]["family"] == "autumn"


def test_deep_and_cool_is_deep_winter():
    assert classify_season(**_metrics(undertone="cool", depth="deep", contrast="high")).season == "deep_winter"


def test_every_branch_returns_a_real_season():
    for undertone in ("warm", "cool", "neutral", "olive"):
        for depth in ("light", "medium", "deep"):
            for chroma in ("bright", "muted"):
                for contrast in ("low", "medium", "high"):
                    result = classify_season(undertone, depth, chroma, contrast)
                    assert result.season in SEASONS
                    assert 0.0 < result.confidence <= 1.0
                    assert result.alternate in SEASONS
                    assert result.alternate != result.season


def test_neutral_undertone_lowers_confidence_and_says_why():
    warm = classify_season(**_metrics())
    neutral = classify_season(**_metrics(undertone="neutral"))
    assert neutral.confidence < warm.confidence
    assert any("undertone" in note.lower() for note in neutral.limitations)


def test_poor_lighting_lowers_confidence_further():
    lit = classify_season(**_metrics())
    unlit = classify_season(**_metrics(), lighting_ok=False)
    assert unlit.confidence < lit.confidence
    assert any("light" in note.lower() for note in unlit.limitations)


def test_report_carries_every_palette_the_ui_renders():
    report = build_color_report({
        "skinUndertone": "cool",
        "contrastLevel": "high",
        "depth": "deep",
        "chroma": "bright",
        "skinColor": "#6b4b3a",
    })
    assert report["season"] == "deep_winter"
    assert report["label"] == "Deep Winter"
    for key in ("best", "neutrals", "accents", "compare", "lipstick", "blush", "eyeshadow", "hair"):
        assert report["palettes"][key], f"{key} palette is empty"
        assert all(s["hex"].startswith("#") for s in report["palettes"][key])
    assert report["metals"]
    assert report["garments"]["indian"] and report["garments"]["global"]
    assert report["skinColor"] == "#6b4b3a"
    assert report["limitations"]


def test_report_without_analysis_data_refuses_to_guess():
    assert build_color_report(None) is None
    assert build_color_report({}) is None


def test_report_falls_back_to_derived_metrics_when_only_legacy_keys_exist():
    # Analyses stored before the season engine landed carry neither depth nor
    # chroma; the report still has to render rather than 500.
    report = build_color_report({"skinUndertone": "warm", "contrastLevel": "medium", "skinColor": "#c89a70"})
    assert report is not None
    assert report["season"] in SEASONS
    assert any("estimate" in note.lower() or "photo" in note.lower() for note in report["limitations"])
