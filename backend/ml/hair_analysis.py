import cv2
import numpy as np
import io
from PIL import Image
import mediapipe as mp


mp_face_mesh = mp.solutions.face_mesh

# Forehead-top landmark; hair sits in the band above it.
_FOREHEAD_TOP = 10
_CHIN = 152


def analyze_hair(image_bytes: bytes) -> dict:
    img = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
    region = _locate_hair_region(img)

    if region is None or region.size == 0:
        # No hair area found (out-of-frame, hat, or bald).
        return {
            "texture": "unknown",
            "thickness": "unknown",
            "length": "unknown",
            "color": None,
            "recommendedStyles": _recommend_styles("unknown"),
        }

    texture = _classify_texture(region)
    color_hex = _dominant_hair_color(region)

    return {
        "texture": texture,
        "thickness": _estimate_thickness(region),
        "length": "medium",  # length needs full-frame segmentation; not inferred here
        "color": color_hex,
        "recommendedStyles": _recommend_styles(texture),
    }


def _locate_hair_region(img: np.ndarray) -> np.ndarray | None:
    """Find the hair band above the forehead using FaceMesh.

    Falls back to a top-strip crop when no face is detected. Returns None when
    the located band lies outside the image (e.g. tightly-cropped photo).
    """
    h, w = img.shape[:2]
    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1,
                               min_detection_confidence=0.5) as mesh:
        results = mesh.process(cv2.cvtColor(img, cv2.COLOR_RGB2BGR))

    if not results.multi_face_landmarks:
        # No face: assume hair occupies the top strip.
        return img[: h // 5, w // 4: 3 * w // 4]

    lm = results.multi_face_landmarks[0].landmark
    forehead_y = int(lm[_FOREHEAD_TOP].y * h)
    chin_y = int(lm[_CHIN].y * h)
    face_h = max(chin_y - forehead_y, 1)

    # Band of ~25% face-height directly above the forehead top.
    band = int(face_h * 0.25)
    y1 = forehead_y
    y0 = max(0, forehead_y - band)
    if y1 - y0 < 4:
        return None  # forehead at the very top edge -> no hair visible

    cx = int(lm[_FOREHEAD_TOP].x * w)
    half = max(int(face_h * 0.3), 8)
    x0, x1 = max(0, cx - half), min(w, cx + half)
    return img[y0:y1, x0:x1]


def _classify_texture(region: np.ndarray) -> str:
    # Edge density as a coarse curl proxy: more high-frequency edges -> curlier.
    # Honest limitation: also responds to image sharpness/lighting.
    gray = cv2.cvtColor(region, cv2.COLOR_RGB2GRAY)
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if lap_var > 500:
        return "curly"
    if lap_var > 200:
        return "wavy"
    return "straight"


def _estimate_thickness(region: np.ndarray) -> str:
    # Darkness/density proxy: denser, more uniform dark area -> thicker coverage.
    gray = cv2.cvtColor(region, cv2.COLOR_RGB2GRAY)
    dark_ratio = float(np.mean(gray < 90))
    if dark_ratio > 0.6:
        return "thick"
    if dark_ratio > 0.3:
        return "medium"
    return "fine"


def _dominant_hair_color(region: np.ndarray) -> str:
    pixels = region.reshape(-1, 3).astype(np.float32)
    k = min(3, len(pixels))
    if k < 1:
        return "#000000"
    _, _, centers = cv2.kmeans(pixels, k, None,
                               (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0),
                               3, cv2.KMEANS_RANDOM_CENTERS)
    darkest = sorted(centers, key=lambda c: c[0] + c[1] + c[2])[0].astype(int)
    return "#{:02x}{:02x}{:02x}".format(*darkest)


def _recommend_styles(texture: str) -> list[str]:
    base = ["lob", "curtain_bangs", "soft_waves"]
    if texture == "curly":
        return ["wash_and_go", "curly_lob", "defined_curls"] + base
    if texture == "wavy":
        return ["beach_waves", "curtain_bangs", "layered_cut"] + base
    if texture == "unknown":
        return base
    return base
