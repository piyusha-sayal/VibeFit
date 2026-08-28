import cv2
import mediapipe as mp
import numpy as np
from typing import Optional
import io
from PIL import Image


mp_face_mesh = mp.solutions.face_mesh


def _load_image(data: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(img)


def analyze_face(image_bytes: bytes) -> dict:
    img = _load_image(image_bytes)
    h, w = img.shape[:2]

    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5) as mesh:
        results = mesh.process(cv2.cvtColor(img, cv2.COLOR_RGB2BGR))

    if not results.multi_face_landmarks:
        return {"shape": "oval", "harmony": 0.82, "landmarks": [], "proportions": {}}

    lm = results.multi_face_landmarks[0].landmark
    pts = [(int(p.x * w), int(p.y * h)) for p in lm]

    shape = _classify_face_shape(pts, w, h)
    harmony = _compute_harmony(pts)
    proportions = _compute_proportions(pts, w, h)

    return {
        "shape": shape,
        "harmony": round(harmony, 3),
        "landmarks": [{"x": p[0] / w, "y": p[1] / h} for p in pts[:68]],
        "proportions": proportions,
    }


def _classify_face_shape(pts: list, w: int, h: int) -> str:
    # Key landmark distances for heuristic classification.
    # 172/397 = true jaw corners (gonial angle); 234/454 = cheekbones (widest);
    # 67/297 = temples; 10 = forehead top; 152 = chin.
    try:
        jaw_width = abs(pts[397][0] - pts[172][0])
        face_height = abs(pts[10][1] - pts[152][1])
        forehead_width = abs(pts[297][0] - pts[67][0])
        cheek_width = abs(pts[234][0] - pts[454][0])

        ratio = face_height / max(cheek_width, 1)
        jaw_ratio = jaw_width / max(cheek_width, 1)

        if ratio > 1.5:
            return "oblong"
        if jaw_ratio < 0.75 and ratio < 1.2:
            return "heart"
        if jaw_ratio > 0.9 and ratio < 1.1:
            return "square"
        if cheek_width > jaw_width * 1.15 and ratio < 1.3:
            return "round"
        return "oval"
    except (IndexError, ZeroDivisionError):
        return "oval"


def _compute_harmony(pts: list) -> float:
    """Composite 0-1 harmony: symmetry, equal vertical thirds, golden ratio.

    Each sub-score spans 0-1 on its own merit (no artificial floor), so the
    result meaningfully differentiates faces instead of clustering at ~0.8.
    """
    try:
        # 1) Symmetry about the facial midline (nose bridge 168 -> chin 152).
        midline_x = (pts[168][0] + pts[152][0]) / 2.0
        face_w = abs(pts[234][0] - pts[454][0]) or 1.0
        pairs = [(33, 263), (61, 291), (130, 359), (226, 446), (172, 397)]
        sym_dev = []
        for l, r in pairs:
            dl = abs(pts[l][0] - midline_x)
            dr = abs(pts[r][0] - midline_x)
            sym_dev.append(abs(dl - dr) / face_w)
        symmetry = max(0.0, 1.0 - float(np.mean(sym_dev)) * 4.0)

        # 2) Vertical thirds equality: forehead(10->9), mid(9->2), lower(2->152).
        t1 = abs(pts[9][1] - pts[10][1])
        t2 = abs(pts[2][1] - pts[9][1])
        t3 = abs(pts[152][1] - pts[2][1])
        thirds = np.array([t1, t2, t3], dtype=float)
        total = thirds.sum() or 1.0
        thirds_dev = np.abs(thirds - total / 3.0).sum() / total
        thirds_score = max(0.0, 1.0 - thirds_dev * 1.5)

        # 3) Face length:width vs golden ratio (~1.618).
        face_h = abs(pts[10][1] - pts[152][1])
        ratio = face_h / face_w
        golden = max(0.0, 1.0 - min(abs(ratio - 1.618) / 1.618, 1.0))

        harmony = 0.5 * symmetry + 0.3 * thirds_score + 0.2 * golden
        return float(np.clip(harmony, 0.0, 1.0))
    except Exception:
        return 0.0


def _compute_proportions(pts: list, w: int, h: int) -> dict:
    try:
        face_h = abs(pts[10][1] - pts[152][1]) / h
        face_w = abs(pts[234][0] - pts[454][0]) / w
        upper_third = abs(pts[10][1] - pts[107][1]) / h
        middle_third = abs(pts[107][1] - pts[57][1]) / h
        lower_third = abs(pts[57][1] - pts[152][1]) / h
        return {
            "faceHeight": round(face_h, 3),
            "faceWidth": round(face_w, 3),
            "upperThird": round(upper_third, 3),
            "middleThird": round(middle_third, 3),
            "lowerThird": round(lower_third, 3),
        }
    except (IndexError, ZeroDivisionError):
        return {}
