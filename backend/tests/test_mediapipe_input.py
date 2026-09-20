"""MediaPipe solutions expect RGB frames.

Every analyzer decodes the upload with PIL as RGB. Passing that through
cv2.COLOR_RGB2BGR first swaps red and blue, and FaceMesh then misses faces in
ordinary portraits. These tests feed a pure-red image and assert that each
analyzer hands MediaPipe the red channel first.
"""
import io

import numpy as np
import pytest
from PIL import Image

import mediapipe as mp

from ml.body_analysis import analyze_body
from ml.color_analysis import analyze_colors
from ml.face_analysis import analyze_face
from ml.feature_analysis import analyze_features
from ml.hair_analysis import analyze_hair
from ml.overlay import annotate_face
from ml.quality import assess_quality
from ml.skin_analysis import analyze_skin

RED = (255, 0, 0)


@pytest.fixture(scope="module")
def red_png() -> bytes:
    buf = io.BytesIO()
    Image.fromarray(np.full((64, 64, 3), RED, dtype=np.uint8)).save(buf, format="PNG")
    return buf.getvalue()


class _NoDetection:
    multi_face_landmarks = None
    pose_landmarks = None
    segmentation_mask = None


def _recording_solution(frames: list):
    class _Solution:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def process(self, frame):
            frames.append(frame)
            return _NoDetection()

    return _Solution


@pytest.mark.parametrize("analyzer", [
    analyze_face, analyze_colors, analyze_hair, analyze_body,
    analyze_skin, assess_quality, analyze_features, annotate_face,
])
def test_mediapipe_receives_rgb(monkeypatch, red_png, analyzer):
    frames: list = []
    monkeypatch.setattr(mp.solutions.face_mesh, "FaceMesh", _recording_solution(frames))
    monkeypatch.setattr(mp.solutions.pose, "Pose", _recording_solution(frames))

    analyzer(red_png)

    assert frames, f"{analyzer.__name__} never called MediaPipe"
    for frame in frames:
        assert tuple(int(c) for c in frame[0, 0]) == RED


def test_no_face_does_not_fabricate_profile(monkeypatch, red_png):
    monkeypatch.setattr(mp.solutions.face_mesh, "FaceMesh", _recording_solution([]))

    result = analyze_face(red_png)

    assert result["shape"] is None
    assert result["harmony"] is None
    assert result["landmarks"] == []
