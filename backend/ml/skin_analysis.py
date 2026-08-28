"""On-device skin analysis: texture, evenness, redness, under-eye, oiliness.

Uses MediaPipe FaceMesh regions + OpenCV color/edge statistics. Deterministic,
offline, free. No model downloads beyond FaceMesh (already used elsewhere).
"""
from __future__ import annotations

import io

import cv2
import mediapipe as mp
import numpy as np
from PIL import Image

mp_face_mesh = mp.solutions.face_mesh

# Region landmark centers (FaceMesh 468). Patches are averaged around each.
FOREHEAD = [10, 109, 338, 67, 297]
LEFT_CHEEK = [50, 101, 205]
RIGHT_CHEEK = [280, 330, 425]
NOSE = [1, 4, 195]
UNDER_EYE = [230, 119, 450, 348]  # below both eyes
T_ZONE = FOREHEAD + NOSE
CHEEKS = LEFT_CHEEK + RIGHT_CHEEK

_PATCH = 6  # half-size of sampled square


def _load_image(data: bytes) -> np.ndarray:
    return np.array(Image.open(io.BytesIO(data)).convert("RGB"))


def analyze_skin(image_bytes: bytes) -> dict:
    img = _load_image(image_bytes)
    h, w = img.shape[:2]

    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1,
                               min_detection_confidence=0.5) as mesh:
        results = mesh.process(cv2.cvtColor(img, cv2.COLOR_RGB2BGR))

    if not results.multi_face_landmarks:
        return _empty(face_found=False)

    lm = results.multi_face_landmarks[0].landmark
    pts = [(int(p.x * w), int(p.y * h)) for p in lm]

    lighting_ok = _lighting_ok(img, pts)

    texture = _texture(img, pts)
    evenness = _evenness(img, pts)
    redness = _redness(img, pts)
    under_eye = _under_eye(img, pts)
    oiliness = _oiliness(img, pts)
    concerns = _concerns(evenness, redness, under_eye, oiliness, texture)

    return {
        "texture": texture,
        "evenness": evenness,
        "redness": redness,
        "underEye": under_eye,
        "oiliness": oiliness,
        "concerns": concerns,
        "quality": {"faceFound": True, "lightingOk": lighting_ok},
    }


def _empty(face_found: bool) -> dict:
    return {
        "texture": "unknown",
        "evenness": 0,
        "redness": "unknown",
        "underEye": "unknown",
        "oiliness": "unknown",
        "concerns": [],
        "quality": {"faceFound": face_found, "lightingOk": False},
    }


def _patches(img: np.ndarray, pts: list, idxs: list) -> np.ndarray:
    """Concatenated RGB pixels from patches around the given landmark indices."""
    h, w = img.shape[:2]
    chunks = []
    for i in idxs:
        if i >= len(pts):
            continue
        x, y = pts[i]
        x0, x1 = max(0, x - _PATCH), min(w, x + _PATCH + 1)
        y0, y1 = max(0, y - _PATCH), min(h, y + _PATCH + 1)
        block = img[y0:y1, x0:x1].reshape(-1, 3)
        if block.size:
            chunks.append(block)
    if not chunks:
        return np.empty((0, 3), dtype=np.uint8)
    return np.concatenate(chunks, axis=0)


def _lighting_ok(img: np.ndarray, pts: list) -> bool:
    skin = _patches(img, pts, CHEEKS + FOREHEAD)
    if skin.size == 0:
        return False
    lum = skin.mean(axis=1)
    mean = float(lum.mean())
    # Reject very dark/blown-out faces; both wreck color metrics.
    return 60.0 <= mean <= 215.0


def _texture(img: np.ndarray, pts: list) -> str:
    """Local high-frequency variance over skin = perceived texture."""
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape
    vals = []
    for i in CHEEKS + FOREHEAD:
        if i >= len(pts):
            continue
        x, y = pts[i]
        x0, x1 = max(0, x - _PATCH), min(w, x + _PATCH + 1)
        y0, y1 = max(0, y - _PATCH), min(h, y + _PATCH + 1)
        region = gray[y0:y1, x0:x1]
        if region.size:
            vals.append(cv2.Laplacian(region, cv2.CV_64F).var())
    if not vals:
        return "unknown"
    v = float(np.mean(vals))
    if v < 12:
        return "smooth"
    if v < 40:
        return "normal"
    return "textured"


def _evenness(img: np.ndarray, pts: list) -> int:
    """Tone uniformity across skin regions -> 0-100 (100 = very even)."""
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    region_means = []
    for idxs in (FOREHEAD, LEFT_CHEEK, RIGHT_CHEEK, NOSE):
        h, w = lab.shape[:2]
        chunks = []
        for i in idxs:
            if i >= len(pts):
                continue
            x, y = pts[i]
            x0, x1 = max(0, x - _PATCH), min(w, x + _PATCH + 1)
            y0, y1 = max(0, y - _PATCH), min(h, y + _PATCH + 1)
            block = lab[y0:y1, x0:x1].reshape(-1, 3)
            if block.size:
                chunks.append(block)
        if chunks:
            region_means.append(np.concatenate(chunks, axis=0).mean(axis=0))
    if len(region_means) < 2:
        return 0
    arr = np.array(region_means)
    # Spread of L/a/b region means; lower spread = more even tone.
    spread = float(np.mean(np.std(arr, axis=0)))
    score = max(0.0, 100.0 - spread * 6.0)
    return int(round(min(100.0, score)))


def _redness(img: np.ndarray, pts: list) -> str:
    """Elevated a* (green-red axis) in skin = redness."""
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    skin = _region_pixels(lab, pts, CHEEKS + NOSE)
    if skin.size == 0:
        return "unknown"
    a = float(skin[:, 1].mean())  # OpenCV LAB a in [0,255], 128 = neutral
    if a < 140:
        return "low"
    if a < 152:
        return "medium"
    return "high"


def _under_eye(img: np.ndarray, pts: list) -> str:
    """Under-eye luminance vs cheek -> darkness/puffiness hint."""
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.float64)
    ue = _region_pixels(gray[..., None], pts, UNDER_EYE)
    cheek = _region_pixels(gray[..., None], pts, CHEEKS)
    if ue.size == 0 or cheek.size == 0:
        return "unknown"
    diff = float(cheek.mean() - ue.mean())  # positive = under-eye darker
    if diff > 22:
        return "dark"
    if diff > 10:
        return "neutral"
    return "bright"


def _oiliness(img: np.ndarray, pts: list) -> str:
    """Specular-highlight ratio in T-zone vs cheeks -> shine."""
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    tzone = _region_pixels(hsv, pts, T_ZONE)
    if tzone.size == 0:
        return "unknown"
    # High value + low saturation = specular shine.
    v = tzone[:, 2].astype(np.float64)
    s = tzone[:, 1].astype(np.float64)
    shine = float(np.mean((v > 200) & (s < 60)))
    if shine > 0.18:
        return "shiny"
    if shine > 0.06:
        return "normal"
    return "matte"


def _region_pixels(arr: np.ndarray, pts: list, idxs: list) -> np.ndarray:
    h, w = arr.shape[:2]
    ch = arr.shape[2] if arr.ndim == 3 else 1
    chunks = []
    for i in idxs:
        if i >= len(pts):
            continue
        x, y = pts[i]
        x0, x1 = max(0, x - _PATCH), min(w, x + _PATCH + 1)
        y0, y1 = max(0, y - _PATCH), min(h, y + _PATCH + 1)
        block = arr[y0:y1, x0:x1].reshape(-1, ch)
        if block.size:
            chunks.append(block)
    if not chunks:
        return np.empty((0, ch), dtype=arr.dtype)
    return np.concatenate(chunks, axis=0)


def _concerns(evenness: int, redness: str, under_eye: str,
              oiliness: str, texture: str) -> list[str]:
    out = []
    if evenness and evenness < 65:
        out.append("uneven tone")
    if redness == "high":
        out.append("redness")
    if under_eye == "dark":
        out.append("under-eye darkness")
    if oiliness == "shiny":
        out.append("excess shine / oiliness")
    if texture == "textured":
        out.append("visible texture")
    return out
