"""Progress trends across a user's analyses (F13). Pure, testable aggregation."""
from __future__ import annotations

# Metric key -> (extractor path description). Extractors pull a numeric value
# from one analysis snapshot dict, or None when unavailable.
_METRICS = ("overallScore", "harmony", "symmetry", "skinEvenness")


def _extract(snapshot: dict) -> dict:
    face = snapshot.get("face") or {}
    skin = snapshot.get("skin") or {}
    scores = face.get("featureScores") or {}
    return {
        "overallScore": face.get("overallScore"),
        "harmony": face.get("harmony"),
        "symmetry": scores.get("symmetry"),
        "skinEvenness": skin.get("evenness"),
    }


def build_progress(snapshots: list[dict]) -> dict:
    """Build per-metric time series + deltas from oldest->newest snapshots.

    Each snapshot: {"date": str, "face": dict|None, "skin": dict|None}.
    delta = latest - earliest; recent = latest - previous (None if <2 points).
    """
    series: dict[str, list[dict]] = {m: [] for m in _METRICS}
    for snap in snapshots:
        vals = _extract(snap)
        for m in _METRICS:
            v = vals[m]
            if isinstance(v, (int, float)):
                series[m].append({"date": snap.get("date"), "value": round(float(v), 3)})

    deltas: dict[str, dict] = {}
    for m in _METRICS:
        pts = series[m]
        if len(pts) >= 2:
            deltas[m] = {
                "delta": round(pts[-1]["value"] - pts[0]["value"], 3),
                "recent": round(pts[-1]["value"] - pts[-2]["value"], 3),
                "latest": pts[-1]["value"],
            }
        elif pts:
            deltas[m] = {"delta": 0.0, "recent": None, "latest": pts[0]["value"]}

    return {"count": len(snapshots), "series": series, "deltas": deltas}
