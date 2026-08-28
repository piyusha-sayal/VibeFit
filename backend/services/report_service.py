"""Generate a face-analysis PDF report from a stored Analysis.

Pure-Python via reportlab (free, no system deps, no network). Builds a
shareable, branded one-to-two page report from the analysis JSON + recs.
"""
from __future__ import annotations

import io
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

# Brand palette (matches the app's dark/gold theme).
_BG = colors.HexColor("#0c0a07")
_GOLD = colors.HexColor("#c9a87c")
_TEXT = colors.HexColor("#f2ece3")
_MUTED = colors.HexColor("#9a9286")
_CARD = colors.HexColor("#1a1712")

_W, _H = A4


def _fmt(value: Any) -> str:
    if value is None:
        return "—"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, float):
        return f"{value:.2f}"
    return str(value)


def _title_case(s: str) -> str:
    return str(s).replace("_", " ").replace("-", " ").title()


class _Cursor:
    """Tracks the vertical draw position with auto page breaks."""

    def __init__(self, c: canvas.Canvas) -> None:
        self.c = c
        self.y = _H - 24 * mm
        self._paint_bg()

    def _paint_bg(self) -> None:
        self.c.setFillColor(_BG)
        self.c.rect(0, 0, _W, _H, fill=1, stroke=0)

    def space(self, dy: float) -> None:
        self.y -= dy
        if self.y < 24 * mm:
            self.c.showPage()
            self._paint_bg()
            self.y = _H - 24 * mm


def _heading(cur: _Cursor, text: str) -> None:
    cur.space(10 * mm)
    cur.c.setFillColor(_GOLD)
    cur.c.setFont("Helvetica-Bold", 13)
    cur.c.drawString(20 * mm, cur.y, text.upper())
    cur.c.setStrokeColor(_GOLD)
    cur.c.setLineWidth(0.5)
    cur.c.line(20 * mm, cur.y - 2 * mm, _W - 20 * mm, cur.y - 2 * mm)
    cur.space(7 * mm)


def _row(cur: _Cursor, label: str, value: str) -> None:
    cur.c.setFillColor(_MUTED)
    cur.c.setFont("Helvetica", 10)
    cur.c.drawString(24 * mm, cur.y, label)
    cur.c.setFillColor(_TEXT)
    cur.c.setFont("Helvetica-Bold", 10)
    cur.c.drawRightString(_W - 24 * mm, cur.y, value)
    cur.space(6.5 * mm)


def _bullets(cur: _Cursor, items: list[str], limit: int = 8) -> None:
    cur.c.setFont("Helvetica", 10)
    for it in items[:limit]:
        cur.c.setFillColor(_GOLD)
        cur.c.drawString(24 * mm, cur.y, "•")
        cur.c.setFillColor(_TEXT)
        cur.c.drawString(28 * mm, cur.y, str(it)[:90])
        cur.space(6 * mm)


def generate_face_report(analysis: Any, user_name: str = "VibeFit User") -> bytes:
    """Render the analysis into PDF bytes."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    cur = _Cursor(c)

    # Header
    c.setFillColor(_GOLD)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(20 * mm, cur.y, "VibeFit")
    c.setFillColor(_MUTED)
    c.setFont("Helvetica", 11)
    c.drawRightString(_W - 20 * mm, cur.y, "Face Analysis Report")
    cur.space(8 * mm)
    c.setFillColor(_TEXT)
    c.setFont("Helvetica", 11)
    c.drawString(20 * mm, cur.y, user_name)
    cur.space(2 * mm)

    face = analysis.face_analysis or {}
    color = analysis.color_analysis or {}
    skin = analysis.skin_analysis or {}
    hair = analysis.hair_analysis or {}

    # Face structure
    _heading(cur, "Facial Structure")
    _row(cur, "Face shape", _title_case(face.get("shape", "—")))
    if "harmony" in face:
        _row(cur, "Harmony score", f"{round(float(face['harmony']) * 100)}/100")
    props = face.get("proportions") or {}
    for k, v in list(props.items())[:6]:
        _row(cur, _title_case(k), _fmt(v))

    # Color / season
    _heading(cur, "Color & Season")
    _row(cur, "Skin undertone", _title_case(color.get("skinUndertone", "—")))
    _row(cur, "Contrast level", _title_case(color.get("contrastLevel", "—")))
    if color.get("skinColor"):
        _row(cur, "Skin tone", str(color["skinColor"]))
    seasonal = color.get("seasonal") or {}
    if seasonal.get("season"):
        _row(cur, "Season", _title_case(seasonal["season"]))

    # Skin
    if skin:
        _heading(cur, "Skin Analysis")
        _row(cur, "Texture", _title_case(skin.get("texture", "—")))
        _row(cur, "Evenness", f"{skin.get('evenness', '—')}/100")
        _row(cur, "Redness", _title_case(skin.get("redness", "—")))
        _row(cur, "Under-eye", _title_case(skin.get("underEye", "—")))
        _row(cur, "Oiliness", _title_case(skin.get("oiliness", "—")))
        concerns = skin.get("concerns") or []
        if concerns:
            cur.space(1 * mm)
            _bullets(cur, [_title_case(x) for x in concerns])

    # Hair
    if hair:
        _heading(cur, "Hair")
        _row(cur, "Texture", _title_case(hair.get("texture", "—")))
        if hair.get("thickness"):
            _row(cur, "Thickness", _title_case(hair["thickness"]))

    # Recommendations
    recs = getattr(analysis, "recommendations", None) or []
    if recs:
        _heading(cur, "Recommendations")
        for r in recs[:6]:
            title = getattr(r, "title", None) or (r.get("title") if isinstance(r, dict) else None)
            items = getattr(r, "items", None) or (r.get("items") if isinstance(r, dict) else None)
            if title:
                cur.c.setFillColor(_GOLD)
                cur.c.setFont("Helvetica-Bold", 10)
                cur.c.drawString(22 * mm, cur.y, str(title)[:80])
                cur.space(5.5 * mm)
            if isinstance(items, list) and items:
                _bullets(cur, [str(i) for i in items], limit=5)

    # Footer
    c.setFillColor(_MUTED)
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(20 * mm, 14 * mm,
                 "Generated on-device by VibeFit. Guidance only, not medical advice.")

    c.showPage()
    c.save()
    return buf.getvalue()
