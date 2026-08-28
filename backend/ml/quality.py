"""Image-quality gate + per-metric flags (F7 pose-quality gate, F11 flags).

Deterministic, offline, free. One FaceMesh + one Pose pass produce a single
``quality`` block the UI can use to prompt a retake and to down-weight
low-confidence metrics. No model downloads beyond those already in use.
"""
from __future__ import annotations

import io

import cv2
import mediapipe as mp
import numpy as np
from PIL import Image

mp_face_mesh = mp.solutions.face_mesh
mp_pose = mp.solutions.pose

# Thresholds (tuned for phone selfies; conservative to avoid false rejects).
_BLUR_MIN = 60.0          # Laplacian variance below this = blurry
_DARK_MIN = 50.0          # mean luminance below this = too dark
_BRIGHT_MAX = 225.0       # mean luminance above this = blown out
_ANGLE_SLIGHT = 0.18      # nose-offset ratio; above = slight turn
_ANGLE_PROFILE = 0.42     # above = near profile


def _load_image(data: bytes) -> np.ndarray:
    return np.array(Image.open(io.BytesIO(data)).convert("RGB"))


def assess_quality(image_bytes: bytes) -> dict:
    """Return a quality report: overall verdict, retake flags, raw metrics."""
    img = _load_image(image_bytes)
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(gray.mean())

    face_found, face_angle = _face_state(img, w, h)
    pose_complete = _pose_complete(img)

    flags = build_flags(face_found, blur, brightness, face_angle, pose_complete)
    overall = _overall(face_found, blur, brightness, face_angle)

    return {
        "overall": overall,
        "faceFound": face_found,
        "poseComplete": pose_complete,
        "flags": flags,
        "metrics": {
            "blur": round(blur, 1),
            "brightness": round(brightness, 1),
            "faceAngle": face_angle,
        },
    }


def build_flags(face_found: bool, blur: float, brightness: float,
                face_angle: str | None, pose_complete: bool) -> list[str]:
    """Pure flag derivation from raw metrics (UI retake prompts)."""
    flags: list[str] = []
    if not face_found:
        flags.append("no face detected")
    if blur < _BLUR_MIN:
        flags.append("blurry")
    if brightness < _DARK_MIN:
        flags.append("too dark")
    elif brightness > _BRIGHT_MAX:
        flags.append("overexposed")
    if face_angle == "profile":
        flags.append("face turned away")
    if not pose_complete:
        flags.append("body not fully visible")
    return flags


def _face_state(img: np.ndarray, w: int, h: int) -> tuple[bool, str | None]:
    """Detect a face and estimate yaw via nose offset between cheek edges."""
    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1,
                               min_detection_confidence=0.5) as mesh:
        results = mesh.process(cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
    if not results.multi_face_landmarks:
        return False, None

    lm = results.multi_face_landmarks[0].landmark
    nose_x = lm[1].x * w
    left_x = lm[234].x * w   # right cheek edge in image space
    right_x = lm[454].x * w  # left cheek edge in image space
    span = abs(right_x - left_x) or 1.0
    center = (left_x + right_x) / 2.0
    offset = abs(nose_x - center) / span  # 0 = centered (frontal)

    if offset >= _ANGLE_PROFILE:
        return True, "profile"
    if offset >= _ANGLE_SLIGHT:
        return True, "slight"
    return True, "frontal"


def _pose_complete(img: np.ndarray) -> bool:
    """True if both shoulders and both hips are confidently visible."""
    with mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5) as pose:
        results = pose.process(cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
    if not results.pose_landmarks:
        return False
    lm = results.pose_landmarks.landmark
    needed = (11, 12, 23, 24)  # shoulders + hips
    return all(lm[i].visibility >= 0.5 for i in needed)


def _overall(face_found: bool, blur: float, brightness: float,
             face_angle: str | None) -> str:
    if not face_found or blur < _BLUR_MIN * 0.5:
        return "poor"
    if blur < _BLUR_MIN or brightness < _DARK_MIN or brightness > _BRIGHT_MAX \
            or face_angle == "profile":
        return "fair"
    return "good"
