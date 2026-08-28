"""Unit tests for feature-scoring helpers (no MediaPipe inference)."""
from ml.feature_analysis import (
    _sym, _prop, score_eyes, score_eyebrows, score_nose, score_lips,
    score_jawline, overall_symmetry, facial_canon, eyebrow_map,
)


def _symmetric_face(n=468):
    """Build a synthetic symmetric face (x mirrored about x=200)."""
    pts = [(200, 200) for _ in range(n)]
    # eyes
    pts[33], pts[133] = (140, 180), (180, 180)   # left eye outer/inner
    pts[362], pts[263] = (220, 180), (260, 180)  # right eye inner/outer
    pts[159], pts[145] = (160, 172), (160, 188)
    pts[386], pts[374] = (240, 172), (240, 188)
    # brows
    pts[55], pts[105], pts[46] = (185, 168), (165, 160), (138, 166)
    pts[285], pts[334], pts[276] = (215, 168), (235, 160), (262, 166)
    # nose
    pts[168], pts[1] = (200, 175), (200, 230)
    pts[98], pts[327] = (188, 240), (212, 240)
    # lips
    pts[61], pts[291], pts[0], pts[17] = (170, 270), (230, 270), (200, 262), (200, 280)
    # jaw / cheeks / chin
    pts[172], pts[397], pts[152] = (150, 300), (250, 300), (200, 340)
    pts[234], pts[454] = (130, 220), (270, 220)
    return pts


def test_sym_identical():
    assert _sym(50.0, 50.0) == 100


def test_sym_divergent():
    assert _sym(100.0, 50.0) == 50


def test_prop_on_target():
    assert _prop(1.0, 1.0, 0.5) == 100


def test_prop_off_target_clamped():
    assert _prop(5.0, 1.0, 0.5) == 0


def test_symmetric_face_scores_high():
    pts = _symmetric_face()
    assert score_eyes(pts) >= 70
    assert score_eyebrows(pts) >= 80
    assert score_jawline(pts) >= 70
    assert overall_symmetry(pts) >= 90


def test_nose_and_lips_centered():
    pts = _symmetric_face()
    assert score_nose(pts) >= 60
    assert score_lips(pts) >= 60


def test_canon_keys_present():
    canon = facial_canon(_symmetric_face())
    assert set(canon) == {"goldenRatio", "eyeSpacing", "lipRatio", "jawAngle"}
    assert all(0 <= v <= 100 for v in canon.values())


def test_eyebrow_map_shape_and_position():
    eb = eyebrow_map(_symmetric_face())
    assert 0.0 <= eb["currentArchPosition"] <= 1.0
    assert eb["shape"] in {"flat", "soft arch", "high arch", "rounded"}
    assert isinstance(eb["guidance"], str)
