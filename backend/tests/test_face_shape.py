"""The nine-category face-shape classifier, tested on synthetic landmark sets.

Each case is built from the four measurements the classifier actually uses, so
a failure points at a threshold rather than at MediaPipe.
"""
import pytest

from ml.face_analysis import classify_face_shape
from rules.face_shape_rules import FACE_SHAPE_GUIDES, guide_for


def _pts(*, height: int, cheek: int, jaw: int, forehead: int, chin: int | None = None) -> list:
    """Build the landmark list the classifier reads, ignoring the rest."""
    pts = [(0, 0)] * 500
    centre = 500
    pts[10] = (centre, 0)                      # forehead top
    pts[152] = (centre, height)                # chin bottom
    pts[172] = (centre - jaw // 2, height - 60)      # jaw corners
    pts[397] = (centre + jaw // 2, height - 60)
    pts[234] = (centre - cheek // 2, height // 2)    # cheekbones
    pts[454] = (centre + cheek // 2, height // 2)
    pts[67] = (centre - forehead // 2, 40)           # temples
    pts[297] = (centre + forehead // 2, 40)
    chin_w = chin if chin is not None else max(int(jaw * 0.55), 10)
    pts[149] = (centre - chin_w // 2, height - 15)   # chin corners
    pts[378] = (centre + chin_w // 2, height - 15)
    return pts


CASES = [
    # (label, kwargs, expected shape)
    ("long with a soft jaw", dict(height=1000, cheek=600, jaw=480, forehead=540), "oblong"),
    ("long with a strong jaw", dict(height=1000, cheek=600, jaw=570, forehead=580), "rectangle"),
    ("wide jaw, short face", dict(height=620, cheek=600, jaw=580, forehead=580), "square"),
    ("cheeks widest, short face", dict(height=640, cheek=620, jaw=470, forehead=500), "round"),
    ("wide forehead, pointed chin", dict(height=760, cheek=600, jaw=380, forehead=610, chin=110), "heart"),
    ("wide forehead, broader chin", dict(height=760, cheek=600, jaw=450, forehead=620, chin=300), "inverted_triangle"),
    ("jaw widest", dict(height=780, cheek=560, jaw=640, forehead=470), "triangle"),
    ("cheeks widest, narrow ends", dict(height=820, cheek=640, jaw=450, forehead=440), "diamond"),
    ("balanced", dict(height=780, cheek=600, jaw=520, forehead=560), "oval"),
]


@pytest.mark.parametrize("label,kwargs,expected", CASES, ids=[c[0] for c in CASES])
def test_classifier_covers_the_nine_styling_categories(label, kwargs, expected):
    result = classify_face_shape(_pts(**kwargs))
    assert result["shape"] == expected, f"{label} -> {result}"


def test_every_result_carries_measurements_and_an_alternate():
    result = classify_face_shape(_pts(height=780, cheek=600, jaw=520, forehead=560))
    assert set(result["measurements"]) == {"lengthToWidth", "jawToCheek", "foreheadToCheek", "chinToJaw"}
    assert all(isinstance(v, float) for v in result["measurements"].values())
    assert result["alternate"] in FACE_SHAPE_GUIDES
    assert result["alternate"] != result["shape"]
    assert 0 < result["confidence"] <= 1


def test_a_borderline_face_is_less_confident_than_a_clear_one():
    clear = classify_face_shape(_pts(height=1100, cheek=600, jaw=460, forehead=520))
    borderline = classify_face_shape(_pts(height=752, cheek=600, jaw=540, forehead=570))
    assert borderline["confidence"] < clear["confidence"]


def test_bad_landmarks_return_nothing_rather_than_a_default_shape():
    # The no-face path must not fall back to "oval" the way the old code did.
    assert classify_face_shape([])["shape"] is None
    assert classify_face_shape([(0, 0)] * 10)["shape"] is None


def test_every_shape_has_styling_guidance():
    for shape in FACE_SHAPE_GUIDES:
        guide = guide_for(shape)
        assert guide.hairstyles and guide.glasses and guide.earrings and guide.makeup

    expected = {
        "oval", "round", "square", "rectangle", "oblong",
        "heart", "diamond", "triangle", "inverted_triangle",
    }
    assert expected <= set(FACE_SHAPE_GUIDES)
