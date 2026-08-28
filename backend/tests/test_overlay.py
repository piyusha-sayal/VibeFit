"""Unit tests for overlay coordinate helpers + no-face passthrough (F3)."""
import io

import numpy as np
from PIL import Image

from ml.overlay import horizontal_thirds, vertical_fifths, annotate_face, FACE_L, FACE_R


def _pts(n=468):
    pts = [(0, 0) for _ in range(n)]
    pts[10], pts[9], pts[2], pts[152] = (100, 20), (100, 60), (100, 110), (100, 160)
    pts[FACE_L], pts[FACE_R] = (50, 100), (150, 100)
    return pts


def test_horizontal_thirds_order():
    ys = horizontal_thirds(_pts())
    assert ys == [20, 60, 110, 160]


def test_vertical_fifths_six_evenly_spaced():
    xs = vertical_fifths(_pts())
    assert len(xs) == 6
    assert xs[0] == 50 and xs[-1] == 150
    assert xs[1] - xs[0] == 20  # (150-50)/5


def test_annotate_no_face_returns_png_bytes():
    img = np.full((64, 64, 3), 30, dtype=np.uint8)  # flat -> no face
    buf = io.BytesIO()
    Image.fromarray(img).save(buf, format="PNG")
    out = annotate_face(buf.getvalue())
    assert isinstance(out, (bytes, bytearray))
    assert out[:8] == b"\x89PNG\r\n\x1a\n"  # valid PNG signature
