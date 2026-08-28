"""Unit tests for quality flag/verdict logic (no MediaPipe inference)."""
from ml.quality import build_flags, _overall


def test_flags_clean_frontal_image():
    assert build_flags(True, 200.0, 130.0, "frontal", True) == []


def test_flags_no_face():
    flags = build_flags(False, 200.0, 130.0, None, False)
    assert "no face detected" in flags


def test_flags_blurry_and_dark():
    flags = build_flags(True, 10.0, 20.0, "frontal", True)
    assert "blurry" in flags
    assert "too dark" in flags


def test_flags_overexposed_and_profile_and_partial_body():
    flags = build_flags(True, 200.0, 240.0, "profile", False)
    assert "overexposed" in flags
    assert "face turned away" in flags
    assert "body not fully visible" in flags


def test_overall_good_clean():
    assert _overall(True, 200.0, 130.0, "frontal") == "good"


def test_overall_poor_no_face():
    assert _overall(False, 200.0, 130.0, None) == "poor"


def test_overall_fair_on_slight_blur():
    assert _overall(True, 40.0, 130.0, "frontal") == "fair"
