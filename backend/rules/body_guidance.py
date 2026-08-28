"""Body proportion -> balance & fit guidance (F9). Deterministic rules, free."""
from __future__ import annotations

# Per body shape: how to balance, what to emphasize/soften, fit notes.
_SHAPE_GUIDE: dict[str, dict] = {
    "pear": {
        "balance": "Draw the eye upward to balance wider hips with the shoulders.",
        "emphasize": ["shoulders", "neckline", "upper body"],
        "soften": ["hip line"],
        "fitNotes": ["Structured shoulders or boat necks add upper width",
                     "Straight or bootcut bottoms in darker tones balance hips"],
    },
    "inverted_triangle": {
        "balance": "Add visual volume below the waist to balance broad shoulders.",
        "emphasize": ["hips", "lower body"],
        "soften": ["shoulder line"],
        "fitNotes": ["A-line or wide-leg bottoms add lower volume",
                     "V-necks and raglan sleeves soften the shoulders"],
    },
    "hourglass": {
        "balance": "Keep the defined waist as the focal point.",
        "emphasize": ["waist"],
        "soften": [],
        "fitNotes": ["Wrap and belted styles follow the natural curve",
                     "Avoid boxy cuts that hide waist definition"],
    },
    "rectangle": {
        "balance": "Create curves and the illusion of a defined waist.",
        "emphasize": ["waist", "curves"],
        "soften": [],
        "fitNotes": ["Peplum, belts and darted tops add shape",
                     "Layering builds dimension"],
    },
    "round": {
        "balance": "Lengthen the torso with vertical lines.",
        "emphasize": ["legs", "neckline"],
        "soften": ["midsection"],
        "fitNotes": ["Vertical seams and open necklines elongate",
                     "Structured, single-tone outfits streamline the middle"],
    },
}

_DEFAULT = {
    "balance": "Aim for balanced proportions between upper and lower body.",
    "emphasize": ["waist"],
    "soften": [],
    "fitNotes": ["Well-fitted, mid-tone pieces flatter most builds"],
}


def body_balance_tips(body: dict) -> dict:
    """Return balance/fit guidance for the detected body shape + ratio note."""
    shape = (body or {}).get("shape")
    guide = dict(_SHAPE_GUIDE.get(shape, _DEFAULT))

    proportions = (body or {}).get("proportions") or {}
    leg_to_torso = proportions.get("legToTorso")
    if isinstance(leg_to_torso, (int, float)):
        if leg_to_torso < 0.95:
            guide["fitNotes"] = guide["fitNotes"] + [
                "High-rise bottoms lengthen a shorter-leg ratio"]
        elif leg_to_torso > 1.25:
            guide["fitNotes"] = guide["fitNotes"] + [
                "Longer tops and mid-rise bottoms balance a long-leg ratio"]
    return guide
