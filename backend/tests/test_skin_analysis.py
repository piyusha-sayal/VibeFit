"""Unit tests for skin_analysis helpers (no MediaPipe inference, no DB)."""
import numpy as np

from ml.skin_analysis import (_texture, _evenness, _redness, _oiliness,
                              _under_eye, _concerns, CHEEKS, FOREHEAD,
                              LEFT_CHEEK, RIGHT_CHEEK, NOSE, UNDER_EYE, T_ZONE)


def _pts(n=468, val=50):
    """Place all referenced landmarks at distinct in-bounds points on a grid."""
    pts = [(val, val) for _ in range(n)]
    used = set(CHEEKS + FOREHEAD + NOSE + UNDER_EYE + T_ZONE)
    # spread them out so patches don't all overlap
    for k, i in enumerate(sorted(used)):
        pts[i] = (20 + (k % 8) * 20, 20 + (k // 8) * 20)
    return pts


def test_texture_smooth_on_flat_image():
    img = np.full((200, 200, 3), 150, dtype=np.uint8)
    assert _texture(img, _pts()) == "smooth"


def test_texture_textured_on_noisy_image():
    rng = np.zeros((200, 200, 3), dtype=np.uint8)
    # high-frequency checkerboard noise
    rng[::2, ::2] = 255
    assert _texture(rng, _pts()) == "textured"


def test_evenness_high_on_uniform_skin():
    img = np.full((200, 200, 3), (200, 150, 130), dtype=np.uint8)
    assert _evenness(img, _pts()) >= 90


def test_redness_low_on_bluish_image():
    img = np.full((200, 200, 3), (120, 130, 200), dtype=np.uint8)
    assert _redness(img, _pts()) in {"low", "medium"}


def test_redness_high_on_red_image():
    img = np.full((200, 200, 3), (230, 90, 90), dtype=np.uint8)
    assert _redness(img, _pts()) == "high"


def test_oiliness_shiny_on_bright_lowsat():
    img = np.full((200, 200, 3), 250, dtype=np.uint8)  # near-white = specular
    assert _oiliness(img, _pts()) == "shiny"


def test_oiliness_matte_on_saturated():
    img = np.full((200, 200, 3), (150, 40, 30), dtype=np.uint8)
    assert _oiliness(img, _pts()) == "matte"


def test_concerns_aggregation():
    c = _concerns(evenness=50, redness="high", under_eye="dark",
                  oiliness="shiny", texture="textured")
    assert "uneven tone" in c
    assert "redness" in c
    assert "under-eye darkness" in c
    assert "excess shine / oiliness" in c
    assert "visible texture" in c


def test_concerns_clear_skin_empty():
    assert _concerns(90, "low", "bright", "matte", "smooth") == []
