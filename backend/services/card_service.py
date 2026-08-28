"""Shareable summary card (F6): a single branded PNG of the key results.

Pure-Python via Pillow (already a dependency). No fonts/network needed — uses
Pillow's built-in font so it runs anywhere. Field extraction is pure/testable.
"""
from __future__ import annotations

import io
from typing import Any

from PIL import Image, ImageDraw, ImageFont

_BG = (12, 10, 7)
_GOLD = (201, 168, 124)
_TEXT = (242, 236, 227)
_MUTED = (154, 146, 134)
_SIZE = 1080


def _title_case(s: str) -> str:
    return str(s).replace("_", " ").replace("-", " ").title()


def card_fields(analysis: Any, user_name: str = "VibeFit User") -> dict:
    """Extract the text/swatch fields shown on the card (pure)."""
    face = getattr(analysis, "face_analysis", None) or {}
    color = getattr(analysis, "color_analysis", None) or {}
    shape = face.get("shape")
    overall = face.get("overallScore")
    seasonal = (color.get("seasonal") or {}).get("label") if color else None
    undertone = color.get("skinUndertone")
    best = color.get("bestColors") or []
    swatches = [c.get("hex") for c in best if isinstance(c, dict) and c.get("hex")][:5]
    return {
        "name": user_name,
        "shape": _title_case(shape) if shape else "—",
        "overall": f"{overall:.1f}/10" if isinstance(overall, (int, float)) else "—",
        "season": seasonal or "—",
        "undertone": _title_case(undertone) if undertone else "—",
        "swatches": swatches,
    }


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()


def generate_summary_card(analysis: Any, user_name: str = "VibeFit User") -> bytes:
    """Render a 1080x1080 PNG summary card and return its bytes."""
    f = card_fields(analysis, user_name)
    img = Image.new("RGB", (_SIZE, _SIZE), _BG)
    d = ImageDraw.Draw(img)

    d.text((80, 90), "VibeFit", font=_font(72), fill=_GOLD)
    d.text((80, 180), f["name"], font=_font(40), fill=_TEXT)

    rows = [
        ("Face Shape", f["shape"]),
        ("Overall", f["overall"]),
        ("Season", f["season"]),
        ("Undertone", f["undertone"]),
    ]
    y = 320
    for label, value in rows:
        d.text((80, y), label.upper(), font=_font(30), fill=_MUTED)
        d.text((80, y + 40), value, font=_font(56), fill=_TEXT)
        y += 150

    if f["swatches"]:
        d.text((80, y), "BEST COLORS", font=_font(30), fill=_MUTED)
        x = 80
        for hex_color in f["swatches"]:
            try:
                rgb = _hex_to_rgb(hex_color)
            except ValueError:
                continue
            d.rounded_rectangle([x, y + 45, x + 140, y + 185], radius=20, fill=rgb)
            x += 160

    d.text((80, _SIZE - 70), "Generated on-device by VibeFit. Guidance only.",
           font=_font(24), fill=_MUTED)

    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    v = value.lstrip("#")
    if len(v) != 6:
        raise ValueError("bad hex")
    return tuple(int(v[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]
