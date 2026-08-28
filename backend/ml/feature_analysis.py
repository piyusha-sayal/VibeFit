"""Per-feature scoring (F2) + eyebrow mapping (F4).

Runs one MediaPipe FaceMesh pass and derives 0-100 scores for eyes, eyebrows,
nose, lips and jawline (symmetry + canon proportion), a facial-canon block, and
an eyebrow shape/arch guide. Deterministic, offline, free. Scoring helpers are
pure (operate on a landmark list) so they unit-test without inference.

Output is merged into ``face_analysis`` by the service (no new DB column).
"""
from __future__ import annotations

import io
import math

import cv2
import mediapipe as mp
import numpy as np
from PIL import Image

mp_face_mesh = mp.solutions.face_mesh

# FaceMesh landmark indices.
L_EYE_OUTER, L_EYE_INNER, L_EYE_TOP, L_EYE_BOT = 33, 133, 159, 145
R_EYE_INNER, R_EYE_OUTER, R_EYE_TOP, R_EYE_BOT = 362, 263, 386, 374
L_BROW_IN, L_BROW_ARCH, L_BROW_OUT = 55, 105, 46
R_BROW_IN, R_BROW_ARCH, R_BROW_OUT = 285, 334, 276
NOSE_BRIDGE, NOSE_TIP, NOSE_L_ALA, NOSE_R_ALA = 168, 1, 98, 327
LIP_L, LIP_R, LIP_TOP, LIP_BOT = 61, 291, 0, 17
JAW_L, JAW_R, CHIN = 172, 397, 152
CHEEK_L, CHEEK_R = 234, 454
MIDLINE_TOP, MIDLINE_BOT = 168, 152


def _load_image(data: bytes) -> np.ndarray:
    return np.array(Image.open(io.BytesIO(data)).convert("RGB"))


def _dist(a: tuple, b: tuple) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _sym(a: float, b: float) -> int:
    """Symmetry of two measured magnitudes -> 0-100 (100 = identical)."""
    m = max(a, b, 1.0)
    return int(round(100.0 * (1.0 - min(abs(a - b) / m, 1.0))))


def _prop(value: float, ideal: float, tol: float) -> int:
    """Closeness of a ratio to its canon ideal -> 0-100 within +/-tol."""
    if tol <= 0:
        return 0
    return int(round(100.0 * (1.0 - min(abs(value - ideal) / tol, 1.0))))


def _face_width(pts: list) -> float:
    return _dist(pts[CHEEK_L], pts[CHEEK_R]) or 1.0


def score_eyes(pts: list) -> int:
    le = _dist(pts[L_EYE_OUTER], pts[L_EYE_INNER])
    re = _dist(pts[R_EYE_INNER], pts[R_EYE_OUTER])
    gap = _dist(pts[L_EYE_INNER], pts[R_EYE_INNER])
    sym = _sym(le, re)
    # Canon: inter-eye gap ~= one eye width.
    avg_eye = (le + re) / 2.0 or 1.0
    prop = _prop(gap / avg_eye, 1.0, 0.5)
    return int(round(0.6 * sym + 0.4 * prop))


def score_eyebrows(pts: list) -> int:
    ll = _dist(pts[L_BROW_OUT], pts[L_BROW_IN])
    rl = _dist(pts[R_BROW_OUT], pts[R_BROW_IN])
    # Arch height above the eye on each side.
    lh = abs(pts[L_BROW_ARCH][1] - pts[L_EYE_TOP][1])
    rh = abs(pts[R_BROW_ARCH][1] - pts[R_EYE_TOP][1])
    return int(round(0.5 * _sym(ll, rl) + 0.5 * _sym(lh, rh)))


def score_nose(pts: list) -> int:
    width = _dist(pts[NOSE_L_ALA], pts[NOSE_R_ALA])
    gap = _dist(pts[L_EYE_INNER], pts[R_EYE_INNER])
    # Canon: nose width ~= inter-inner-eye distance.
    prop = _prop(width / (gap or 1.0), 1.0, 0.5)
    # Tip centred on the facial midline.
    midline_x = (pts[MIDLINE_TOP][0] + pts[MIDLINE_BOT][0]) / 2.0
    centred = _prop(abs(pts[NOSE_TIP][0] - midline_x) / _face_width(pts), 0.0, 0.12)
    return int(round(0.5 * prop + 0.5 * centred))


def score_lips(pts: list) -> int:
    width = _dist(pts[LIP_L], pts[LIP_R])
    # Canon: lip width ~= 0.46 of face width.
    prop = _prop(width / _face_width(pts), 0.46, 0.18)
    midline_x = (pts[MIDLINE_TOP][0] + pts[MIDLINE_BOT][0]) / 2.0
    lip_centre = (pts[LIP_L][0] + pts[LIP_R][0]) / 2.0
    centred = _prop(abs(lip_centre - midline_x) / _face_width(pts), 0.0, 0.1)
    return int(round(0.5 * prop + 0.5 * centred))


def score_jawline(pts: list) -> int:
    left = _dist(pts[JAW_L], pts[CHIN])
    right = _dist(pts[JAW_R], pts[CHIN])
    sym = _sym(left, right)
    # Canon: jaw (gonial) width ~= 0.8 of cheek width for balance.
    jaw_w = _dist(pts[JAW_L], pts[JAW_R])
    prop = _prop(jaw_w / _face_width(pts), 0.8, 0.25)
    return int(round(0.6 * sym + 0.4 * prop))


def overall_symmetry(pts: list) -> int:
    midline_x = (pts[MIDLINE_TOP][0] + pts[MIDLINE_BOT][0]) / 2.0
    fw = _face_width(pts)
    pairs = [(L_EYE_OUTER, R_EYE_OUTER), (LIP_L, LIP_R),
             (L_BROW_OUT, R_BROW_OUT), (JAW_L, JAW_R), (CHEEK_L, CHEEK_R)]
    devs = []
    for l, r in pairs:
        dl = abs(pts[l][0] - midline_x)
        dr = abs(pts[r][0] - midline_x)
        devs.append(abs(dl - dr) / fw)
    return int(round(100.0 * max(0.0, 1.0 - float(np.mean(devs)) * 4.0)))


def facial_canon(pts: list) -> dict:
    """Canon ratios as 0-100 closeness scores (fills FacialCanon type)."""
    fw = _face_width(pts)
    fh = abs(pts[MIDLINE_TOP][1] - pts[CHIN][1]) or 1.0  # bridge->chin proxy
    le = _dist(pts[L_EYE_OUTER], pts[L_EYE_INNER])
    re = _dist(pts[R_EYE_INNER], pts[R_EYE_OUTER])
    gap = _dist(pts[L_EYE_INNER], pts[R_EYE_INNER])
    lip_w = _dist(pts[LIP_L], pts[LIP_R])
    jaw_w = _dist(pts[JAW_L], pts[JAW_R])
    return {
        "goldenRatio": _prop((fh / fw) if fw else 0, 1.3, 0.5),
        "eyeSpacing": _prop(gap / (((le + re) / 2.0) or 1.0), 1.0, 0.5),
        "lipRatio": _prop(lip_w / fw, 0.46, 0.18),
        "jawAngle": _prop(jaw_w / fw, 0.8, 0.25),
    }


def eyebrow_map(pts: list) -> dict:
    """Arch position + shape + simple grooming guidance (F4)."""
    inner, arch, outer = pts[L_BROW_IN], pts[L_BROW_ARCH], pts[L_BROW_OUT]
    span = (outer[0] - inner[0]) or 1.0
    arch_pos = round(abs(arch[0] - inner[0]) / abs(span), 2)
    # Rise of the arch relative to the brow head.
    rise = (inner[1] - arch[1]) / (_face_width(pts) or 1.0)
    if rise < 0.015:
        shape = "flat"
    elif rise < 0.04:
        shape = "soft arch"
    else:
        shape = "high arch"
    ideal = 0.66  # arch peaks ~2/3 from the inner corner
    if arch_pos < 0.5:
        guidance = "Arch sits too far inward; extend the peak outward toward the outer third."
    elif arch_pos > 0.8:
        guidance = "Arch sits far out; bring the peak slightly inward for balance."
    else:
        guidance = "Arch placement is well balanced."
    return {
        "currentArchPosition": arch_pos,
        "idealArchPosition": ideal,
        "shape": shape,
        "guidance": guidance,
    }


def analyze_features(image_bytes: bytes) -> dict:
    """FaceMesh once -> feature scores + canon + eyebrow map. Empty on no face."""
    img = _load_image(image_bytes)
    h, w = img.shape[:2]
    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1,
                               refine_landmarks=True,
                               min_detection_confidence=0.5) as mesh:
        results = mesh.process(cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
    if not results.multi_face_landmarks:
        return {"featureScores": {}, "canon": {}, "eyebrow": {}}

    lm = results.multi_face_landmarks[0].landmark
    pts = [(int(p.x * w), int(p.y * h)) for p in lm]
    try:
        scores = {
            "symmetry": overall_symmetry(pts),
            "eyes": score_eyes(pts),
            "eyebrows": score_eyebrows(pts),
            "nose": score_nose(pts),
            "lips": score_lips(pts),
            "jawline": score_jawline(pts),
        }
        return {
            "featureScores": scores,
            "canon": facial_canon(pts),
            "eyebrow": eyebrow_map(pts),
        }
    except (IndexError, ZeroDivisionError):
        return {"featureScores": {}, "canon": {}, "eyebrow": {}}
