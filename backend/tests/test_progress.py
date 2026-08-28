"""Unit tests for progress aggregation (F13)."""
from services.progress import build_progress


def _snap(date, overall, evenness):
    return {"date": date, "face": {"overallScore": overall}, "skin": {"evenness": evenness}}


def test_empty():
    p = build_progress([])
    assert p["count"] == 0
    assert p["deltas"] == {}


def test_single_snapshot_no_recent():
    p = build_progress([_snap("2026-01-01", 7.0, 80)])
    assert p["count"] == 1
    assert p["deltas"]["overallScore"]["recent"] is None
    assert p["deltas"]["overallScore"]["latest"] == 7.0


def test_trend_deltas():
    snaps = [_snap("2026-01-01", 7.0, 70),
             _snap("2026-02-01", 7.5, 75),
             _snap("2026-03-01", 8.0, 82)]
    p = build_progress(snaps)
    assert p["deltas"]["overallScore"]["delta"] == 1.0      # 8.0 - 7.0
    assert p["deltas"]["overallScore"]["recent"] == 0.5     # 8.0 - 7.5
    assert p["deltas"]["skinEvenness"]["delta"] == 12.0
    assert len(p["series"]["overallScore"]) == 3


def test_missing_metric_skipped():
    snaps = [{"date": "d1", "face": {}, "skin": {}},
             {"date": "d2", "face": {"harmony": 0.8}, "skin": {}}]
    p = build_progress(snaps)
    assert p["series"]["overallScore"] == []
    assert len(p["series"]["harmony"]) == 1
