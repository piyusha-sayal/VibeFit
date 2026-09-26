"""The attribute vocabulary behind Discover My Face.

Three kinds of attribute live here, and the difference matters:

1. `measured` — the existing MediaPipe/OpenCV pass really produces this.
2. `self_select` — no reliable classifier exists, so the user chooses from a
   described list. Guided self-selection is honest; a fabricated AI reading is
   not, and no paid vision provider is being added to pretend otherwise.
3. Derived — computed from (1) without new image work, e.g. facial contrast
   from the colour analysis that already ran.

Nothing here scores a face or calls any proportion ideal. Every option is a
styling starting point.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AttributeOption:
    key: str
    label: str
    description: str
    styling: list[str]


@dataclass(frozen=True)
class FaceAttribute:
    key: str
    label: str
    source: str  # "measured" | "self_select" | "derived"
    intro: str
    options: list[AttributeOption]
    """Why this attribute is measured, derived or asked for."""
    method: str = ""


def _o(key: str, label: str, description: str, styling: list[str]) -> AttributeOption:
    return AttributeOption(key=key, label=label, description=description, styling=styling)


EYE_SHAPES = [
    _o("almond", "Almond", "Slightly tapered at both corners, with a visible crease.",
       ["Liner that extends just past the outer corner", "Shadow slightly deeper in the outer third",
        "Most techniques translate directly, so this is a good shape to experiment from"]),
    _o("round", "Round", "As tall as it is wide, with the iris often fully visible.",
       ["Liner kept thin at the inner corner and winged outward to lengthen",
        "Shadow drawn horizontally rather than upward", "Lashes longest at the outer third"]),
    _o("monolid", "Monolid", "A smooth lid with no visible crease.",
       ["Colour placed close to the lash line, where it stays visible with the eye open",
        "Gradient upward rather than a cut crease", "Tightlining defines without taking space"]),
    _o("hooded", "Hooded", "The brow bone folds over part of the lid.",
       ["Colour placed on the visible lid with eyes open, not in the hidden crease",
        "A thin liner; thick liner disappears under the fold", "Matte shadow above the fold to set it back"]),
    _o("double_eyelid", "Double eyelid", "A defined crease above the lash line.",
       ["The crease gives a natural boundary for a darker shade",
        "Shimmer on the mobile lid catches light well", "Liner can be thicker without closing the eye"]),
    _o("upturned", "Upturned", "The outer corner sits higher than the inner.",
       ["Shadow weighted along the lower outer corner to balance the lift",
        "A straight rather than sharply winged liner", "Soft smudge under the lower lash line"]),
    _o("downturned", "Downturned", "The outer corner sits lower than the inner.",
       ["A wing angled upward from the lower lash line", "Shadow lifted at the outer corner",
        "Lashes longest just before the outer corner, not at it"]),
    _o("deep_set", "Deep-set", "The eye sits further back under a prominent brow bone.",
       ["Lighter shades on the lid to bring it forward", "Keeping the crease shade soft, not dark",
        "Light liner rather than heavy, which can recede further"]),
    _o("prominent", "Prominent", "The lid sits forward and is fully visible.",
       ["Medium and deeper mattes to set the lid back", "Keeping shimmer to the inner corner",
        "Liner along the upper lash line, blended rather than glossy"]),
]

BROW_SHAPES = [
    _o("straight", "Straight", "Little arch; the brow runs largely flat.",
       ["Softening the tail upward slightly if you want more lift", "Brushing hairs up at the head for height"]),
    _o("soft_arch", "Soft arch", "A gentle curve peaking past the pupil.",
       ["Filling the arch lightly to keep it soft", "A tail that ends level with the outer eye corner"]),
    _o("defined_arch", "Defined arch", "A clear peak with a visible angle.",
       ["Keeping the peak where it already sits, rather than moving it", "Powder rather than pencil to soften"]),
    _o("rounded", "Rounded", "A curved brow without a sharp peak.",
       ["Extending the tail slightly to lengthen", "Keeping the head soft so it does not read heavy"]),
    _o("s_shaped", "S-shaped", "A curve that rises and falls more than once.",
       ["Following the natural line rather than straightening it", "Filling sparse sections only"]),
]

LIP_SHAPES = [
    _o("full", "Full", "Both lips are generous relative to the mouth width.",
       ["Liner on the natural line rather than outside it", "Matte finishes stay put on a fuller lip",
        "Deeper shades read intentional rather than heavy"]),
    _o("thin", "Thin", "Both lips are slim relative to the mouth width.",
       ["Liner just on the outer edge of the natural line", "Satin and gloss finishes add apparent fullness",
        "Mid-depth shades rather than very dark ones"]),
    _o("top_heavy", "Fuller upper lip", "The upper lip is fuller than the lower.",
       ["Building the lower lip slightly with liner", "A dab of gloss at the centre of the lower lip"]),
    _o("bottom_heavy", "Fuller lower lip", "The lower lip is fuller than the upper.",
       ["Defining the cupid's bow to balance", "Keeping gloss central rather than across the whole lower lip"]),
    _o("wide", "Wide", "The mouth is wide relative to the face.",
       ["Colour kept slightly inside the corners", "Gradient lips, which focus the centre"]),
    _o("heart", "Heart-shaped", "A pronounced cupid's bow over a fuller lower lip.",
       ["Tracing the bow rather than flattening it", "Blotted finishes, which suit the shape's softness"]),
]

CHEEK_CONTOURS = [
    _o("high", "High cheekbones", "The widest point sits high on the face.",
       ["Blush on the cheekbone itself, swept toward the temple", "Highlight kept above the blush"]),
    _o("soft", "Soft cheeks", "Fullness low and rounded, with little visible bone.",
       ["Blush on the apple, blended upward", "Cream formulas, which look natural on fuller cheeks"]),
    _o("flat", "Flat plane", "Little visible difference between cheek and jaw.",
       ["Blush placed slightly higher than the apple", "A soft contour under the cheekbone, warm rather than grey"]),
    _o("hollow", "Defined hollows", "A visible dip below the cheekbone.",
       ["Blush kept on the apple and high, away from the hollow", "Cream blush to avoid emphasising texture"]),
]

FACIAL_CONTRAST = [
    _o("soft", "Soft contrast", "Hair, skin and eyes sit close together in depth.",
       ["Makeup in the same register — deep shades can overpower",
        "Blended edges rather than sharp lines", "One focal point at a time"]),
    _o("medium", "Medium contrast", "A clear but not dramatic difference between features.",
       ["Most makeup intensities work; the occasion can decide",
        "A defined lip or a defined eye, either reads naturally"]),
    _o("defined", "Defined contrast", "A marked difference between hair, skin and eyes.",
       ["Makeup that matches the contrast already there, or the face outshines it",
        "Defined liner and a clear lip hold up", "Very soft looks can read as unfinished"]),
]

FACE_ATTRIBUTES: dict[str, FaceAttribute] = {
    "eye_shape": FaceAttribute(
        key="eye_shape", label="Eye shape", source="self_select",
        intro="Eye shape drives almost every eye-makeup decision. MyLookFit does not "
              "classify it from a photo, because no reliable landmark rule separates "
              "hooded from deep-set at selfie resolution.",
        method="You choose from the descriptions below, in a mirror.",
        options=EYE_SHAPES,
    ),
    "brow_shape": FaceAttribute(
        key="brow_shape", label="Eyebrow shape", source="measured",
        intro="Your scan measures where your arch peaks along the brow, and the shape "
              "that implies. You can override it if you disagree.",
        method="Measured from the brow landmarks in your most recent scan.",
        options=BROW_SHAPES,
    ),
    "lip_shape": FaceAttribute(
        key="lip_shape", label="Lip shape", source="self_select",
        intro="Your scan measures lip width relative to your face, but not the balance "
              "between the two lips, which is what most lip technique depends on.",
        method="You choose; the measured proportion is shown alongside for context.",
        options=LIP_SHAPES,
    ),
    "cheek_contour": FaceAttribute(
        key="cheek_contour", label="Cheeks", source="self_select",
        intro="Cheek shape decides blush placement. Photographic lighting changes "
              "apparent cheek contour more than the cheek itself does, so this one is yours to set.",
        method="You choose, ideally in even daylight.",
        options=CHEEK_CONTOURS,
    ),
    "facial_contrast": FaceAttribute(
        key="facial_contrast", label="Facial contrast", source="derived",
        intro="How far apart your hair, skin and eyes sit in depth. This one comes "
              "from the colour analysis that already ran — no extra scan needed.",
        method="Derived from the contrast level in your colour analysis.",
        options=FACIAL_CONTRAST,
    ),
}

SELF_SELECT_KEYS = tuple(k for k, a in FACE_ATTRIBUTES.items() if a.source == "self_select")


def options_for(attribute_key: str) -> list[AttributeOption]:
    attribute = FACE_ATTRIBUTES.get(attribute_key)
    return list(attribute.options) if attribute else []


def option_for(attribute_key: str, option_key: str) -> AttributeOption | None:
    for option in options_for(attribute_key):
        if option.key == option_key:
            return option
    return None


def is_valid(attribute_key: str, option_key: str) -> bool:
    return option_for(attribute_key, option_key) is not None


# Mapping from the measured brow arch position to a brow shape option, so the
# measurement the scan already produces lands on the same vocabulary the user
# picks from.
def brow_shape_from_map(eyebrow: dict | None) -> str | None:
    shape = (eyebrow or {}).get("shape")
    if not shape:
        return None
    normalised = str(shape).lower().replace(" ", "_")
    mapping = {
        "flat": "straight",
        "straight": "straight",
        "soft": "soft_arch",
        "soft_arch": "soft_arch",
        "curved": "rounded",
        "rounded": "rounded",
        "arched": "defined_arch",
        "high_arch": "defined_arch",
        "defined_arch": "defined_arch",
        "s_shaped": "s_shaped",
    }
    return mapping.get(normalised)


def contrast_from_colour(colors: dict | None) -> str | None:
    level = (colors or {}).get("contrastLevel")
    return {"low": "soft", "medium": "medium", "high": "defined"}.get(level)
