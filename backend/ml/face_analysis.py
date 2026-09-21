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
        results = mesh.process(img)

    if not results.multi_face_landmarks:
        # Absence is not an average face. Returning a plausible-looking shape
        # and score here made failed scans indistinguishable from real results.
        return {"shape": None, "harmony": None, "landmarks": [], "proportions": {}}

    lm = results.multi_face_landmarks[0].landmark
    pts = [(int(p.x * w), int(p.y * h)) for p in lm]

    classification = classify_face_shape(pts)
    harmony = _compute_harmony(pts)
    proportions = _compute_proportions(pts, w, h)

    return {
        "shape": classification["shape"],
        "alternateShape": classification["alternate"],
        "shapeConfidence": classification["confidence"],
        "shapeMeasurements": classification["measurements"],
        "harmony": round(harmony, 3),
        "landmarks": [{"x": p[0] / w, "y": p[1] / h} for p in pts[:68]],
        "proportions": proportions,
    }


# Thresholds are ratios of measured landmark distances. They are stylist
# conventions expressed as geometry, not learned parameters — which is why they
# live here in the open rather than inside a model file.
_LONG_FACE = 1.45          # height / cheek width above this reads as a long face
_STRONG_JAW = 0.92         # jaw / cheek at or above this reads as a strong jaw
_NARROW_JAW = 0.80         # jaw / cheek below this reads as a narrow jaw
_POINTED_CHIN = 0.45       # chin / jaw below this reads as a pointed chin
_SHORT_FACE = 1.15


def classify_face_shape(pts: list) -> dict:
    """Classify a face into one of nine styling categories.

    Returns the shape, the runner-up worth comparing, the four measured ratios
    the call was made from, and a confidence that drops as those ratios approach
    a threshold. Returns a null shape rather than a default when the landmarks
    are unusable: a fallback shape is indistinguishable from a real result.
    """
    try:
        jaw_width = abs(pts[397][0] - pts[172][0])
        face_height = abs(pts[10][1] - pts[152][1])
        forehead_width = abs(pts[297][0] - pts[67][0])
        cheek_width = abs(pts[234][0] - pts[454][0])
        chin_width = abs(pts[378][0] - pts[149][0])
    except (IndexError, TypeError):
        return _no_shape()

    if not all((jaw_width, face_height, forehead_width, cheek_width)):
        return _no_shape()

    length = face_height / cheek_width
    jaw = jaw_width / cheek_width
    forehead = forehead_width / cheek_width
    chin = chin_width / jaw_width if jaw_width else 0.0

    shape, alternate = _shape_from_ratios(length, jaw, forehead, chin)
    return {
        "shape": shape,
        "alternate": alternate,
        "confidence": _confidence(length, jaw, forehead),
        "measurements": {
            "lengthToWidth": round(length, 3),
            "jawToCheek": round(jaw, 3),
            "foreheadToCheek": round(forehead, 3),
            "chinToJaw": round(chin, 3),
        },
    }


def _no_shape() -> dict:
    return {"shape": None, "alternate": None, "confidence": 0.0, "measurements": {}}


def _shape_from_ratios(length: float, jaw: float, forehead: float, chin: float) -> tuple[str, str]:
    """Return (shape, alternate). The alternate is the neighbour it nearly was."""
    if length >= _LONG_FACE:
        # A long face is rectangle or oblong depending on how square the jaw is.
        return ("rectangle", "oblong") if jaw >= _STRONG_JAW else ("oblong", "rectangle")

    if jaw > 1.0 and jaw > forehead:
        # Jaw wider than the cheekbones: the styling problem is the opposite of
        # a heart, so it gets its own category rather than being called square.
        return "triangle", "square"

    if forehead > 1.0 and jaw < _NARROW_JAW:
        # Wide forehead over a narrow jaw. The chin decides which of the two.
        return ("heart", "inverted_triangle") if chin < _POINTED_CHIN else ("inverted_triangle", "heart")

    if jaw >= _STRONG_JAW and forehead >= 0.9:
        return ("square", "rectangle") if length < _SHORT_FACE else ("rectangle", "square")

    if jaw < _NARROW_JAW and forehead < 0.95 and length >= _SHORT_FACE:
        return "diamond", "oval"

    if length < 1.25 and jaw < 0.9:
        return "round", "oval"

    return ("oval", "round") if length < 1.3 else ("oval", "oblong")


def _confidence(length: float, jaw: float, forehead: float) -> float:
    """Lower confidence the closer a measurement sits to a decision threshold.

    A photo cannot support certainty; a face that is millimetres from being
    called something else should not be reported as firmly as one that is not.
    """
    margins = [
        abs(length - _LONG_FACE),
        abs(jaw - _STRONG_JAW),
        abs(jaw - _NARROW_JAW),
        abs(forehead - 1.0),
    ]
    closest = min(margins)
    # 0.10 away from every threshold is as certain as this method gets.
    confidence = 0.45 + min(closest / 0.10, 1.0) * 0.35
    return round(confidence, 2)


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
