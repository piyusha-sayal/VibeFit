"""Unit tests for multi-photo aggregation (F10)."""
from services.aggregate import (aggregate_faces, aggregate_skins,
                                aggregate_analysis, _majority, _mean)


def test_majority_ignores_unknown():
    assert _majority(["oval", "oval", "round", "unknown", None]) == "oval"


def test_mean_skips_non_numeric():
    assert _mean([10, 20, None, "x"]) == 15.0


def test_aggregate_faces_votes_shape_and_means_scores():
    faces = [
        {"shape": "oval", "harmony": 0.8, "overallScore": 7.0,
         "featureScores": {"symmetry": 80, "eyes": 70}},
        {"shape": "oval", "harmony": 0.9, "overallScore": 8.0,
         "featureScores": {"symmetry": 90, "eyes": 80}},
        {"shape": "round", "harmony": 0.7, "overallScore": 6.0,
         "featureScores": {"symmetry": 70, "eyes": 60}},
    ]
    out = aggregate_faces(faces)
    assert out["shape"] == "oval"
    assert out["harmony"] == 0.8
    assert out["featureScores"]["symmetry"] == 80
    assert out["overallScore"] == 7.0


def test_aggregate_skins():
    skins = [{"texture": "smooth", "evenness": 80, "redness": "low",
              "underEye": "bright", "oiliness": "matte"},
             {"texture": "smooth", "evenness": 90, "redness": "low",
              "underEye": "neutral", "oiliness": "normal"}]
    out = aggregate_skins(skins)
    assert out["texture"] == "smooth"
    assert out["evenness"] == 85
    assert out["redness"] == "low"


def test_aggregate_analysis_picks_best_quality_for_colors():
    per_image = [
        {"face": {"shape": "oval"}, "skin": {"evenness": 70},
         "colors": {"skinUndertone": "warm"}, "hair": {"x": 1}, "body": {"shape": "pear"},
         "quality": {"overall": "poor", "faceFound": True, "metrics": {"blur": 10}}},
        {"face": {"shape": "oval"}, "skin": {"evenness": 90},
         "colors": {"skinUndertone": "cool"}, "hair": {"x": 2}, "body": {"shape": "pear"},
         "quality": {"overall": "good", "faceFound": True, "metrics": {"blur": 200}}},
    ]
    out = aggregate_analysis(per_image)
    assert out["frames"] == 2
    assert out["colors"]["skinUndertone"] == "cool"   # from good-quality frame
    assert out["face"]["shape"] == "oval"


def test_aggregate_empty():
    assert aggregate_analysis([]) == {}
