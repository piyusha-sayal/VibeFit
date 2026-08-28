"""Real ML-pipeline tests (#3): exercise the actual analyzers end-to-end.

Runs MediaPipe/OpenCV inference on a synthetic image. A flat image has no
detectable face/pose, so this asserts the *contract* (keys + types) and the
graceful no-detection defaults — proving the pipeline never crashes on bad input.
"""
import io

import numpy as np
import pytest
from PIL import Image

from ml.face_analysis import analyze_face
from ml.color_analysis import analyze_colors
from ml.hair_analysis import analyze_hair
from ml.body_analysis import analyze_body
from ml.skin_analysis import analyze_skin
from ml.quality import assess_quality
from ml.feature_analysis import analyze_features
from ml.overlay import annotate_face


@pytest.fixture(scope="module")
def image_bytes() -> bytes:
    arr = np.full((300, 300, 3), 140, dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, format="JPEG")
    return buf.getvalue()


def test_face_contract(image_bytes):
    out = analyze_face(image_bytes)
    assert {"shape", "harmony", "landmarks", "proportions"} <= set(out)
    assert isinstance(out["harmony"], (int, float))


def test_colors_contract(image_bytes):
    out = analyze_colors(image_bytes)
    assert {"skinUndertone", "contrastLevel", "palette"} <= set(out)


def test_hair_contract(image_bytes):
    out = analyze_hair(image_bytes)
    assert {"texture", "recommendedStyles"} <= set(out)


def test_body_contract(image_bytes):
    out = analyze_body(image_bytes)
    assert "shape" in out and "proportions" in out


def test_skin_contract_no_face(image_bytes):
    out = analyze_skin(image_bytes)
    assert out["quality"]["faceFound"] is False
    assert out["texture"] == "unknown"


def test_quality_flags_no_face(image_bytes):
    out = assess_quality(image_bytes)
    assert out["faceFound"] is False
    assert "no face detected" in out["flags"]
    assert out["overall"] == "poor"


def test_features_empty_no_face(image_bytes):
    out = analyze_features(image_bytes)
    assert out["featureScores"] == {}
    assert out["canon"] == {}


def test_overlay_returns_png(image_bytes):
    png = annotate_face(image_bytes)
    assert png[:8] == b"\x89PNG\r\n\x1a\n"
