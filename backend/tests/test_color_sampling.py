"""Unit tests for color_analysis skin sampling (no MediaPipe run, no DB)."""
import numpy as np

from ml.color_analysis import _sample_skin, CHEEK_LANDMARKS, _classify_undertone, _rgb_to_hex


class _LM:
    def __init__(self, x, y):
        self.x = x
        self.y = y


class _Face:
    def __init__(self, landmarks):
        self.landmark = landmarks


class _Results:
    def __init__(self, faces):
        self.multi_face_landmarks = faces


def _landmarks(w, h, cheek_rgb_pos):
    """Place all needed cheek landmarks at normalized centers; pad to 468."""
    pts = [_LM(0.5, 0.5) for _ in range(468)]
    for idx, (nx, ny) in zip(CHEEK_LANDMARKS, cheek_rgb_pos):
        pts[idx] = _LM(nx, ny)
    return pts


def test_no_face_returns_default():
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    assert _sample_skin(img, _Results(None), 100, 100) == (200, 170, 140)


def test_samples_cheek_region_not_background():
    h = w = 200
    img = np.zeros((h, w, 3), dtype=np.uint8)  # black background
    skin = (210, 160, 130)
    # paint a skin block around the center where cheek landmarks sit (0.5,0.5)
    img[80:120, 80:120] = skin
    positions = [(0.5, 0.5)] * len(CHEEK_LANDMARKS)
    res = _Results([_Face(_landmarks(w, h, positions))])
    r, g, b = _sample_skin(img, res, w, h)
    assert (r, g, b) == skin  # picks skin, ignores black background


def test_median_ignores_outlier_pixels():
    h = w = 200
    img = np.full((h, w, 3), (208, 158, 128), dtype=np.uint8)
    # drop a few black "shadow/hair" pixels at the patch center
    img[100, 100] = (0, 0, 0)
    positions = [(0.5, 0.5)] * len(CHEEK_LANDMARKS)
    res = _Results([_Face(_landmarks(w, h, positions))])
    r, g, b = _sample_skin(img, res, w, h)
    assert (r, g, b) == (208, 158, 128)  # median unaffected by stray dark pixel


def test_warm_skin_classified_warm():
    assert _classify_undertone((220, 160, 120)) == "warm"


def test_hex_roundtrip():
    assert _rgb_to_hex((255, 0, 16)) == "#ff0010"
