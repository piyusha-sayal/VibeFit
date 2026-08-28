"""Annotated face overlay (F3): draw facial thirds / fifths / golden guides.

Stateless: takes image bytes, returns annotated PNG bytes. Used by a stateless
endpoint so no extra storage is needed. Coordinate helpers are pure for testing.
"""
from __future__ import annotations

import io

import cv2
import mediapipe as mp
import numpy as np
from PIL import Image

mp_face_mesh = mp.solutions.face_mesh

_GOLD = (124, 168, 201)   # BGR of #c9a87c-ish for visibility on skin
_LINE = (90, 200, 255)
_THICK = 2

# Landmarks for horizontal facial thirds and outer face bounds.
TRICHION, GLABELLA, SUBNASALE, MENTON = 10, 9, 2, 152
FACE_L, FACE_R = 234, 454


def _load_image(data: bytes) -> np.ndarray:
    return np.array(Image.open(io.BytesIO(data)).convert("RGB"))


def horizontal_thirds(pts: list) -> list[int]:
    """Y of the four horizontal landmarks defining the facial thirds."""
    return [pts[TRICHION][1], pts[GLABELLA][1], pts[SUBNASALE][1], pts[MENTON][1]]


def vertical_fifths(pts: list) -> list[int]:
    """Six evenly spaced X lines across the face = vertical fifths."""
    x0, x1 = pts[FACE_L][0], pts[FACE_R][0]
    return [int(round(x0 + (x1 - x0) * i / 5.0)) for i in range(6)]


def annotate_face(image_bytes: bytes) -> bytes:
    """Return a PNG with thirds/fifths guides drawn; original PNG if no face."""
    img = _load_image(image_bytes)
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    h, w = img.shape[:2]

    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1,
                               min_detection_confidence=0.5) as mesh:
        results = mesh.process(bgr)

    if results.multi_face_landmarks:
        lm = results.multi_face_landmarks[0].landmark
        pts = [(int(p.x * w), int(p.y * h)) for p in lm]
        x_left, x_right = pts[FACE_L][0], pts[FACE_R][0]
        for y in horizontal_thirds(pts):
            cv2.line(bgr, (x_left, y), (x_right, y), _LINE, _THICK)
        y_top, y_bot = pts[TRICHION][1], pts[MENTON][1]
        for x in vertical_fifths(pts):
            cv2.line(bgr, (x, y_top), (x, y_bot), _GOLD, 1)
        cv2.putText(bgr, "Facial thirds & fifths", (10, 24),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, _GOLD, 2, cv2.LINE_AA)

    ok, buf = cv2.imencode(".png", bgr)
    return buf.tobytes() if ok else image_bytes
