import cv2
import numpy as np
import mediapipe as mp
from typing import Optional
import io
from PIL import Image


mp_face_mesh = mp.solutions.face_mesh

# True mid-cheek landmark indices (fleshy cheek, clear of jaw/hair/shadow).
# Old list used jawline/chin contour points (132,58,172,136,150,148,152...) which
# pulled in shadow and hair, skewing undertone. These sit on both cheeks proper.
CHEEK_LANDMARKS = [50, 101, 205, 280, 330, 425]

# Half-size of the square patch averaged around each landmark.
_PATCH_RADIUS = 4


def _load_image(data: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(img)


def analyze_colors(image_bytes: bytes) -> dict:
    img = _load_image(image_bytes)
    h, w = img.shape[:2]
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)

    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, min_detection_confidence=0.5) as mesh:
        results = mesh.process(cv2.cvtColor(img, cv2.COLOR_RGB2BGR))

    skin_rgb = _sample_skin(img, results, w, h)
    undertone = _classify_undertone(skin_rgb)
    contrast = _classify_contrast(img, results, w, h)
    palette = _generate_palette(undertone, skin_rgb)
    hex_color = _rgb_to_hex(skin_rgb)

    return {
        "skinUndertone": undertone,
        "contrastLevel": contrast,
        "skinColor": hex_color,
        "palette": {"primary": palette},
    }


def _sample_skin(img: np.ndarray, results, w: int, h: int) -> tuple[int, int, int]:
    if not results.multi_face_landmarks:
        return (200, 170, 140)
    lm = results.multi_face_landmarks[0].landmark
    patches = []
    for idx in CHEEK_LANDMARKS:
        cx, cy = int(lm[idx].x * w), int(lm[idx].y * h)
        x0, x1 = np.clip(cx - _PATCH_RADIUS, 0, w), np.clip(cx + _PATCH_RADIUS + 1, 0, w)
        y0, y1 = np.clip(cy - _PATCH_RADIUS, 0, h), np.clip(cy + _PATCH_RADIUS + 1, 0, h)
        patch = img[y0:y1, x0:x1].reshape(-1, 3)
        if patch.size:
            patches.append(patch)
    if not patches:
        return (200, 170, 140)
    # Median over all cheek-patch pixels: robust to stray dark/highlight pixels.
    mean = np.median(np.concatenate(patches, axis=0), axis=0).astype(int)
    return (int(mean[0]), int(mean[1]), int(mean[2]))


def _classify_undertone(rgb: tuple[int, int, int]) -> str:
    r, g, b = rgb
    warm_score = r - b
    cool_score = b - r + (g - r) * 0.5
    if warm_score > 20:
        return "warm"
    if cool_score > 10:
        return "cool"
    return "neutral"


def _classify_contrast(img: np.ndarray, results, w: int, h: int) -> str:
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    std = float(np.std(gray))
    if std > 60:
        return "high"
    if std > 35:
        return "medium"
    return "low"


def _generate_palette(undertone: str, skin: tuple[int, int, int]) -> list[str]:
    warm_palette = ["#c8956c", "#d4a853", "#8b6f47", "#e8d5c0", "#4a3728", "#b5a090"]
    cool_palette = ["#8090a0", "#4a6080", "#c8d4d8", "#5a7b8a", "#2d4a5c", "#a0b4bc"]
    neutral_palette = ["#a89070", "#6b8070", "#d0c4b0", "#507060", "#3a3028", "#90a090"]
    if undertone == "warm":
        return warm_palette
    if undertone == "cool":
        return cool_palette
    return neutral_palette


def _rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)
