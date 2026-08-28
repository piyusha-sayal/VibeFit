"""Aggregate multiple photos into stabler scores (F10). Pure + testable.

Numeric metrics are averaged; categoricals use majority vote; colors/hair/body
are taken from the highest-quality frame. Reduces single-shot noise (lighting,
angle) without any model changes.
"""
from __future__ import annotations

from collections import Counter


def _mean(values: list, nd: int = 3):
    nums = [float(v) for v in values if isinstance(v, (int, float))]
    return round(sum(nums) / len(nums), nd) if nums else None


def _majority(values: list):
    vals = [v for v in values if v not in (None, "", "unknown")]
    if not vals:
        return None
    return Counter(vals).most_common(1)[0][0]


def _quality_rank(q: dict | None) -> tuple:
    """Higher is better: good>fair>poor, then face found, then sharper."""
    q = q or {}
    order = {"good": 2, "fair": 1, "poor": 0}
    return (order.get(q.get("overall"), 0),
            1 if q.get("faceFound") else 0,
            float((q.get("metrics") or {}).get("blur") or 0.0))


def aggregate_faces(faces: list[dict]) -> dict:
    faces = [f for f in faces if f]
    if not faces:
        return {}
    out: dict = {"shape": _majority([f.get("shape") for f in faces])}
    harmony = _mean([f.get("harmony") for f in faces])
    if harmony is not None:
        out["harmony"] = harmony
    overall = _mean([f.get("overallScore") for f in faces], nd=1)
    if overall is not None:
        out["overallScore"] = overall

    keys = {k for f in faces for k in (f.get("featureScores") or {})}
    scores = {k: _mean([(f.get("featureScores") or {}).get(k) for f in faces], nd=0)
              for k in keys}
    scores = {k: int(v) for k, v in scores.items() if v is not None}
    if scores:
        out["featureScores"] = scores
    return out


def aggregate_skins(skins: list[dict]) -> dict:
    skins = [s for s in skins if s]
    if not skins:
        return {}
    return {
        "texture": _majority([s.get("texture") for s in skins]),
        "evenness": int(_mean([s.get("evenness") for s in skins], nd=0) or 0),
        "redness": _majority([s.get("redness") for s in skins]),
        "underEye": _majority([s.get("underEye") for s in skins]),
        "oiliness": _majority([s.get("oiliness") for s in skins]),
    }


def aggregate_analysis(per_image: list[dict]) -> dict:
    """Combine N per-image ML dicts into one aggregated result.

    Each item: {"face","colors","hair","body","skin","quality"}.
    """
    if not per_image:
        return {}
    best = max(per_image, key=lambda r: _quality_rank(r.get("quality")))
    return {
        "face": aggregate_faces([r.get("face") for r in per_image]),
        "skin": aggregate_skins([r.get("skin") for r in per_image]),
        "colors": best.get("colors"),
        "hair": best.get("hair"),
        "body": best.get("body"),
        "quality": best.get("quality"),
        "frames": len(per_image),
    }
