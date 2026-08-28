import mediapipe as mp
import numpy as np
import cv2
import io
import math
from PIL import Image


mp_pose = mp.solutions.pose


def analyze_body(image_bytes: bytes) -> dict:
    img = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
    h, w = img.shape[:2]

    with mp_pose.Pose(static_image_mode=True, enable_segmentation=True,
                      min_detection_confidence=0.5) as pose:
        results = pose.process(cv2.cvtColor(img, cv2.COLOR_RGB2BGR))

    if not results.pose_landmarks:
        return {"shape": None, "proportions": {}}

    lm = results.pose_landmarks.landmark

    def pt(idx: int) -> tuple[float, float]:
        return lm[idx].x * w, lm[idx].y * h

    try:
        l_shoulder, r_shoulder = pt(11), pt(12)
        l_hip, r_hip = pt(23), pt(24)
        l_knee, r_knee = pt(25), pt(26)

        shoulder_y = int((l_shoulder[1] + r_shoulder[1]) / 2)
        hip_y = int((l_hip[1] + r_hip[1]) / 2)

        # Prefer silhouette widths from the segmentation mask (pose-robust);
        # fall back to landmark x-distance if no mask.
        mask = _segmentation_mask(results, h, w)
        if mask is not None:
            shoulder_w = _mask_width_at(mask, shoulder_y)
            hip_w = _mask_width_at(mask, hip_y)
            waist_w = _min_mask_width_between(mask, shoulder_y, hip_y)
        else:
            shoulder_w = abs(l_shoulder[0] - r_shoulder[0])
            hip_w = abs(l_hip[0] - r_hip[0])
            waist_w = None

        shoulder_w = shoulder_w or abs(l_shoulder[0] - r_shoulder[0])
        hip_w = hip_w or abs(l_hip[0] - r_hip[0])

        torso_h = abs(shoulder_y - hip_y)
        leg_h = abs(hip_y - (l_knee[1] + r_knee[1]) / 2)

        waist_to_hip = round(waist_w / hip_w, 3) if waist_w and hip_w else None
        shape = _classify_body_shape(shoulder_w, waist_w, hip_w)

        proportions = {
            "shoulderToHip": round(shoulder_w / max(hip_w, 1), 3),
            "waistToHip": waist_to_hip,  # measured, None if mask unavailable
            "legToTorso": round(leg_h / max(torso_h, 1), 3),
        }
        posture = _posture(l_shoulder, r_shoulder, pt(0), pt(7), pt(8))
        return {"shape": shape, "proportions": proportions, "posture": posture}
    except (IndexError, ZeroDivisionError):
        return {"shape": None, "proportions": {}}


def _posture(l_sh: tuple, r_sh: tuple, nose: tuple,
             l_ear: tuple, r_ear: tuple) -> dict:
    """Shoulder tilt + head lean from frontal pose landmarks (F8).

    Frontal photos give reliable shoulder level and head lateral lean;
    true head-forward needs a side view, so it is not claimed here.
    """
    dx = r_sh[0] - l_sh[0]
    dy = r_sh[1] - l_sh[1]
    tilt = abs(math.degrees(math.atan2(dy, dx or 1.0)))
    tilt = min(tilt, 180.0 - tilt)  # fold to 0-90
    if tilt < 3.0:
        level = "even"
    elif tilt < 7.0:
        level = "slight"
    else:
        level = "tilted"

    sh_mid_x = (l_sh[0] + r_sh[0]) / 2.0
    ear_mid_x = (l_ear[0] + r_ear[0]) / 2.0
    shoulder_w = abs(r_sh[0] - l_sh[0]) or 1.0
    lean = (ear_mid_x - sh_mid_x) / shoulder_w
    if abs(lean) < 0.08:
        head = "centered"
    elif lean > 0:
        head = "leaning right"
    else:
        head = "leaning left"

    return {"shoulderTilt": round(tilt, 1), "level": level, "headLean": head}


def _segmentation_mask(results, h: int, w: int) -> np.ndarray | None:
    seg = getattr(results, "segmentation_mask", None)
    if seg is None:
        return None
    mask = (seg > 0.5).astype(np.uint8)
    if mask.shape != (h, w):
        mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)
    return mask


def _mask_width_at(mask: np.ndarray, y: int) -> float:
    """Foreground width (px) on the row at y; 0 if out of range/empty."""
    h = mask.shape[0]
    y = int(np.clip(y, 0, h - 1))
    row = mask[y]
    cols = np.flatnonzero(row)
    return float(cols[-1] - cols[0]) if cols.size else 0.0


def _min_mask_width_between(mask: np.ndarray, y_top: int, y_bottom: int) -> float | None:
    """Narrowest silhouette width between two rows = waist estimate."""
    y0, y1 = sorted((int(y_top), int(y_bottom)))
    widths = [w for y in range(y0, y1 + 1) if (w := _mask_width_at(mask, y)) > 0]
    return float(min(widths)) if widths else None


def _classify_body_shape(shoulder_w: float, waist_w: float | None, hip_w: float) -> str:
    if not hip_w:
        return "rectangle"
    sh = shoulder_w / hip_w
    # With a measured waist, distinguish hourglass (defined waist) properly.
    if waist_w:
        wh = waist_w / hip_w
        if 0.9 <= sh <= 1.1 and wh < 0.8:
            return "hourglass"
        if sh > 1.15:
            return "inverted_triangle"
        if sh < 0.85:
            return "pear"
        if wh >= 0.85:
            return "rectangle"
        return "hourglass"
    # No waist: shoulder/hip ratio only.
    if sh > 1.2:
        return "inverted_triangle"
    if sh < 0.85:
        return "pear"
    if 0.9 <= sh <= 1.1:
        return "rectangle"
    return "rectangle"
