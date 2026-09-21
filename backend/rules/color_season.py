"""Deterministic twelve-season personal-colour classification.

Takes the four measurements the existing OpenCV/MediaPipe pass already produces
— undertone, depth, chroma and contrast — and maps them onto a season. No AI
call is involved, so a report costs nothing and is reproducible.

Photographic colour is unreliable: white balance, filters and phone processing
all shift skin. The result therefore carries a confidence and a plain list of
limitations rather than presenting itself as a measurement.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .color_palettes import SEASONS

# A firm call on a clean photo. Nothing here reaches 1.0 — a selfie cannot.
BASE_CONFIDENCE = 0.78
NEUTRAL_PENALTY = 0.15
OLIVE_PENALTY = 0.10
LIGHTING_PENALTY = 0.20
DERIVED_METRIC_PENALTY = 0.08
MIN_CONFIDENCE = 0.25

_LIGHTING_NOTE = (
    "Lighting, filters and automatic phone colour correction all shift skin tone. "
    "Compare the swatches against your face in daylight before trusting the call."
)
_NEUTRAL_NOTE = (
    "Your undertone reads as neutral rather than clearly warm or cool, so the season "
    "is a best fit rather than a firm answer. Compare it with the alternate season."
)
_OLIVE_NOTE = (
    "Olive skin carries a green cast that photographs as neither warm nor cool. "
    "The palette leans muted on purpose; compare the alternate season too."
)
_DERIVED_NOTE = (
    "This analysis predates the season engine, so depth and clarity were estimated "
    "from the stored skin tone. Re-scan for a sharper result."
)
_ALWAYS_NOTE = (
    "A season is a starting point for exploring colour, not a rule about what you "
    "are allowed to wear."
)


@dataclass(frozen=True)
class SeasonResult:
    season: str
    alternate: str
    confidence: float
    limitations: list[str] = field(default_factory=list)


def _family(undertone: str, chroma: str, contrast: str) -> str:
    """Warmth picks the half, clarity picks the quarter."""
    if undertone == "warm":
        return "spring" if chroma == "bright" else "autumn"
    if undertone == "cool":
        return "winter" if chroma == "bright" else "summer"
    # Neutral and olive skin has no decisive warmth, so contrast decides how
    # sharp the palette should be and the muted seasons take the rest.
    if contrast == "high":
        return "winter" if chroma == "bright" else "autumn"
    return "summer" if undertone == "cool" or chroma == "muted" else "spring"


def _season_in_family(family: str, depth: str, contrast: str) -> tuple[str, str]:
    """Return (season, alternate) — the alternate is the neighbour worth comparing."""
    if family == "spring":
        if depth == "light":
            return "light_spring", "warm_spring"
        if contrast == "high":
            return "bright_spring", "warm_spring"
        return "warm_spring", ("bright_spring" if depth == "deep" else "light_spring")
    if family == "summer":
        if depth == "light":
            return "light_summer", "soft_summer"
        if contrast == "low":
            return "soft_summer", "cool_summer"
        return "cool_summer", "soft_summer"
    if family == "autumn":
        if depth == "deep":
            return "deep_autumn", "warm_autumn"
        if contrast == "low":
            return "soft_autumn", "warm_autumn"
        return "warm_autumn", ("deep_autumn" if contrast == "high" else "soft_autumn")
    if depth == "deep":
        return "deep_winter", "cool_winter"
    if contrast == "high":
        return "bright_winter", "cool_winter"
    return "cool_winter", "bright_winter"


def classify_season(
    undertone: str,
    depth: str,
    chroma: str,
    contrast: str,
    *,
    lighting_ok: bool = True,
    metrics_derived: bool = False,
) -> SeasonResult:
    """Map measured colour traits onto one of the twelve seasons."""
    family = _family(undertone, chroma, contrast)
    season, alternate = _season_in_family(family, depth, contrast)

    confidence = BASE_CONFIDENCE
    limitations = [_LIGHTING_NOTE, _ALWAYS_NOTE]

    if undertone == "neutral":
        confidence -= NEUTRAL_PENALTY
        limitations.insert(0, _NEUTRAL_NOTE)
    elif undertone == "olive":
        confidence -= OLIVE_PENALTY
        limitations.insert(0, _OLIVE_NOTE)
    if not lighting_ok:
        confidence -= LIGHTING_PENALTY
    if metrics_derived:
        confidence -= DERIVED_METRIC_PENALTY
        limitations.insert(0, _DERIVED_NOTE)

    return SeasonResult(
        season=season,
        alternate=alternate,
        confidence=round(max(confidence, MIN_CONFIDENCE), 2),
        limitations=limitations,
    )


def _hex_to_rgb(value: str) -> tuple[int, int, int] | None:
    raw = (value or "").lstrip("#")
    if len(raw) != 6:
        return None
    try:
        return int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16)
    except ValueError:
        return None


def _derive_depth(skin_hex: str) -> str:
    """Rec. 601 luma off the stored cheek colour, for analyses with no depth."""
    rgb = _hex_to_rgb(skin_hex)
    if not rgb:
        return "medium"
    r, g, b = rgb
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    if luma >= 175:
        return "light"
    if luma <= 110:
        return "deep"
    return "medium"


def _derive_chroma(contrast: str) -> str:
    """Without a saturation reading, contrast is the only clarity signal left."""
    return "bright" if contrast == "high" else "muted"


def build_color_report(colors: dict | None, *, lighting_ok: bool = True) -> dict | None:
    """Build the full personal-colour report from a stored colour analysis.

    Returns None when there is no colour analysis to work from: an empty report
    is honest, an invented season is not.
    """
    if not colors:
        return None
    undertone = colors.get("skinUndertone")
    if not undertone:
        return None

    contrast = colors.get("contrastLevel") or "medium"
    skin_hex = colors.get("skinColor") or ""

    depth = colors.get("depth")
    chroma = colors.get("chroma")
    derived = depth is None or chroma is None
    depth = depth or _derive_depth(skin_hex)
    chroma = chroma or _derive_chroma(contrast)

    result = classify_season(
        undertone, depth, chroma, contrast,
        lighting_ok=lighting_ok, metrics_derived=derived,
    )
    season = SEASONS[result.season]
    alternate = SEASONS[result.alternate]

    return {
        "season": result.season,
        "label": season["label"],
        "family": season["family"],
        "summary": season["summary"],
        "undertone": undertone,
        "depth": depth,
        "chroma": chroma,
        "contrast": contrast,
        "skinColor": skin_hex,
        "confidence": result.confidence,
        "limitations": result.limitations,
        "alternate": {
            "season": result.alternate,
            "label": alternate["label"],
            "summary": alternate["summary"],
        },
        "palettes": {
            "best": season["best"],
            "neutrals": season["neutrals"],
            "accents": season["accents"],
            "compare": season["compare"],
            "lipstick": season["lipstick"],
            "blush": season["blush"],
            "eyeshadow": season["eyeshadow"],
            "hair": season["hair"],
        },
        "metals": season["metals"],
        "garments": season["garments"],
    }
