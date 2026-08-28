"""Unit tests for ML helper logic (#4 face harmony, #5 hair, #6 body).

Pure functions only — no MediaPipe inference, no DB.
"""
import numpy as np

from ml.face_analysis import _compute_harmony, _classify_face_shape
from ml.hair_analysis import (_classify_texture, _estimate_thickness,
                              _dominant_hair_color, _recommend_styles)
from ml.body_analysis import (_mask_width_at, _min_mask_width_between,
                              _classify_body_shape)


# ---- #4 face_analysis ----

def _symmetric_face():
    """468 landmarks, perfectly symmetric, equal thirds, near-golden ratio."""
    pts = [(250.0, 250.0) for _ in range(468)]
    cx = 250.0
    pts[10] = (cx, 100)    # forehead top
    pts[9] = (cx, 200)     # glabella  -> third1 = 100
    pts[2] = (cx, 300)     # subnasale -> third2 = 100
    pts[152] = (cx, 400)   # chin      -> third3 = 100
    pts[168] = (cx, 180)   # nose bridge (midline)
    pts[234], pts[454] = (cx - 93, 250), (cx + 93, 250)  # cheeks; ratio 300/186~1.61
    for l, r, off in [(33, 263, 70), (61, 291, 35), (130, 359, 60),
                      (226, 446, 80), (172, 397, 75), (67, 297, 85)]:
        pts[l], pts[r] = (cx - off, 250), (cx + off, 250)
    return pts


def test_harmony_high_for_ideal_face():
    h = _compute_harmony(_symmetric_face())
    assert 0.85 <= h <= 1.0


def test_harmony_drops_with_asymmetry():
    pts = _symmetric_face()
    pts[263] = (pts[263][0] + 120, pts[263][1])  # shove one eye outward
    assert _compute_harmony(pts) < 0.85


def test_harmony_full_range_not_floored():
    # Wildly asymmetric + skewed thirds should score well below the old 0.65 floor.
    pts = _symmetric_face()
    for idx in (263, 291, 359, 446, 397):
        pts[idx] = (pts[idx][0] + 200, pts[idx][1])
    assert _compute_harmony(pts) < 0.65


def test_face_shape_uses_true_jaw_corners():
    # Square: wide jaw ~ cheek width, low length:width ratio (<1.1).
    pts = [(250.0, 250.0) for _ in range(468)]
    cx = 250.0
    pts[10] = (cx, 100)                                   # forehead top
    pts[152] = (cx, 280)                                  # chin -> height 180
    pts[234], pts[454] = (cx - 100, 200), (cx + 100, 200)  # cheek width 200; ratio 0.9
    pts[172], pts[397] = (cx - 95, 250), (cx + 95, 250)    # jaw width 190; jaw_ratio 0.95
    pts[67], pts[297] = (cx - 90, 150), (cx + 90, 150)     # forehead width
    assert _classify_face_shape(pts, 500, 500) == "square"


# ---- #5 hair_analysis ----

def test_texture_thresholds():
    flat = np.full((40, 40, 3), 120, dtype=np.uint8)
    assert _classify_texture(flat) == "straight"


def test_thickness_dark_region_is_thick():
    dark = np.full((40, 40, 3), 20, dtype=np.uint8)
    assert _estimate_thickness(dark) == "thick"
    light = np.full((40, 40, 3), 200, dtype=np.uint8)
    assert _estimate_thickness(light) == "fine"


def test_dominant_color_hex_format():
    region = np.full((20, 20, 3), (40, 30, 20), dtype=np.uint8)
    c = _dominant_hair_color(region)
    assert c.startswith("#") and len(c) == 7


def test_unknown_texture_returns_base_styles():
    assert _recommend_styles("unknown") == ["lob", "curtain_bangs", "soft_waves"]


# ---- #6 body_analysis ----

def _mask_with_silhouette():
    """200x200 mask: wide shoulders (y=40), narrow waist (y=100), wide hips (y=160)."""
    m = np.zeros((200, 200), dtype=np.uint8)
    m[30:50, 60:140] = 1     # shoulders width 80
    m[90:110, 90:110] = 1    # waist width 20
    m[150:170, 65:135] = 1   # hips width 70
    return m


def test_mask_width_at():
    m = _mask_with_silhouette()
    assert _mask_width_at(m, 40) == 79   # 139-60
    assert _mask_width_at(m, 0) == 0


def test_min_width_between_is_waist():
    m = _mask_with_silhouette()
    waist = _min_mask_width_between(m, 40, 160)
    assert waist == 19  # narrowest row (waist)


def test_classify_hourglass_with_waist():
    # balanced shoulder/hip + defined waist -> hourglass
    assert _classify_body_shape(100, 60, 100) == "hourglass"


def test_classify_pear_without_waist():
    assert _classify_body_shape(70, None, 100) == "pear"


def test_classify_rectangle_undefined_waist():
    assert _classify_body_shape(100, 95, 100) == "rectangle"
