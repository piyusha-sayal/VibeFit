"""The makeup aesthetic, technique and occasion library behind Makeup Studio.

Static stylist knowledge. No product SKUs and no shade matching: MyLookFit cannot
see a foundation bottle or your skin under a store light, so it names undertone
and depth families and leaves the exact shade to a swatch on your jaw.

Nothing here corrects a face. Techniques are described as what they do
visually, so the choice stays with the person.
"""
from __future__ import annotations

from dataclasses import dataclass

OCCASIONS = ("everyday", "work", "evening", "wedding", "festival", "photography")
TIME_BUDGETS = (5, 10, 20, 40)
INTENSITIES = ("bare", "soft", "defined", "bold")


@dataclass(frozen=True)
class Aesthetic:
    key: str
    name: str
    summary: str
    # What actually distinguishes this look at the mirror.
    signature: list[str]
    intensity: str
    minutes: int
    occasions: list[str]
    origin: str = "global"


AESTHETICS: list[Aesthetic] = [
    Aesthetic("natural", "Natural", "Skin that looks like skin, with everything else dialled back.",
              ["Sheer base, spot-concealed only", "Cream blush pressed in with fingers",
               "Brows brushed up, nothing filled", "Balm on the lips"],
              "bare", 5, ["everyday", "work"]),
    Aesthetic("no_makeup", "No-makeup makeup", "Visibly groomed, not visibly made up.",
              ["Tinted moisturiser rather than foundation", "Concealer only where you look at it",
               "A wash of neutral shadow", "Clear or tinted brow gel"],
              "bare", 8, ["everyday", "work"]),
    Aesthetic("clean_girl", "Clean", "Glossy, minimal and deliberately undone.",
              ["Dewy skin, cream everything", "Gloss instead of lipstick",
               "Laminated brows", "Highlight on the high points only"],
              "soft", 10, ["everyday", "work", "evening"]),
    Aesthetic("glass_skin", "Glass skin", "Luminous, layered skin as the whole point of the look.",
              ["Hydration layered before base", "Sheer, light-reflecting base",
               "Liquid highlight mixed into the base, not on top", "Soft gradient lip"],
              "soft", 15, ["everyday", "evening", "photography"], origin="korean"),
    Aesthetic("korean_gradient", "Gradient lip", "Colour concentrated at the centre of the lip.",
              ["Blurred lip edges, deepest at the centre", "Straight, softly filled brows",
               "Pink or peach cheek placed high", "Minimal contour"],
              "soft", 12, ["everyday", "evening"], origin="korean"),
    Aesthetic("soft_glam", "Soft glam", "Polished and photograph-ready without hard lines.",
              ["Full but skin-like base", "Blended matte and shimmer shadow",
               "Soft wing", "Satin lip in a mid-depth shade"],
              "defined", 25, ["evening", "wedding", "photography"]),
    Aesthetic("full_glam", "Full glam", "Everything turned up, on purpose.",
              ["Full-coverage base, set", "Cut crease or deep blended shadow",
               "Sharp liner and lashes", "Defined lip with liner"],
              "bold", 40, ["evening", "wedding", "photography"]),
    Aesthetic("indian_bridal", "Indian bridal", "Built to hold for a long day and read in photographs.",
              ["Long-wear base, heavily set", "Warm, jewel-toned shadow with shimmer",
               "Kajal along the waterline and lash line", "Deep lip with liner; bindi if worn"],
              "bold", 40, ["wedding", "festival", "photography"], origin="indian"),
    Aesthetic("festive_indian", "Festive", "Celebration makeup that sits lighter than bridal.",
              ["Glowing rather than matte base", "One jewel tone on the lid",
               "Kajal, softly smudged", "Berry or brick lip"],
              "defined", 20, ["festival", "evening", "wedding"], origin="indian"),
    Aesthetic("smokey", "Smokey eye", "Depth blended outward from the lash line.",
              ["Darkest shade at the lash line, fading up", "Liner smudged, not drawn",
               "Lower lash line carried round", "Neutral lip so the eye leads"],
              "bold", 25, ["evening", "wedding"]),
    Aesthetic("monochrome", "Monochrome", "One colour family on eyes, cheeks and lips.",
              ["A single shade family throughout", "Cream textures, easy to blend",
               "Minimal contour so the colour reads", "Skin left fairly bare"],
              "soft", 12, ["everyday", "evening"]),
    Aesthetic("editorial", "Editorial", "A deliberate graphic element as the focus.",
              ["One strong idea — graphic liner, a colour wash, a placed gloss",
               "Everything else kept flat", "Brows sometimes bleached or softened",
               "Skin matte or wet, rarely in between"],
              "bold", 30, ["evening", "photography"]),
    Aesthetic("vintage", "Vintage", "A classic winged liner and red lip.",
              ["Matte, even base", "Defined wing with a clean edge",
               "Warm contour under the cheekbone", "Blue-red or orange-red matte lip"],
              "defined", 25, ["evening", "wedding", "photography"]),
    Aesthetic("office", "Office", "Awake and neutral, and it survives a full day.",
              ["Medium-coverage base, set at the T-zone", "Neutral matte shadow",
               "Tightlined rather than winged", "A my-lips-but-better satin"],
              "soft", 10, ["work", "everyday"]),
]

AESTHETIC_BY_KEY = {a.key: a for a in AESTHETICS}


@dataclass(frozen=True)
class Technique:
    key: str
    name: str
    # The attribute this technique responds to, e.g. "eye_shape:hooded".
    applies_to: list[str]
    steps: list[str]
    note: str = ""


TECHNIQUES: list[Technique] = [
    Technique("hooded_lid", "Placing shadow on a hooded lid", ["eye_shape:hooded"],
              ["Open your eyes and look straight ahead — mark where the fold sits.",
               "Keep colour below that line, where it stays visible.",
               "Put the deepest shade at the outer corner, not in the hidden crease.",
               "A matte a shade above your skin, above the fold, keeps it from looking heavy."],
              "Everything hidden by the fold is invisible with your eyes open."),
    Technique("monolid_gradient", "Building a gradient on a monolid", ["eye_shape:monolid"],
              ["Start with colour hugging the lash line.",
               "Fade it upward with a clean blending brush.",
               "Tightline to define without taking lid space.",
               "Keep shimmer central, where light catches with the eye open."]),
    Technique("downturned_lift", "Lifting a downturned outer corner", ["eye_shape:downturned"],
              ["Draw the wing from the lower lash line upward, not from the top line down.",
               "Stop shadow just before the outer corner rather than dragging it past.",
               "Longest lashes just inside the outer corner."]),
    Technique("round_lengthen", "Lengthening a round eye", ["eye_shape:round"],
              ["Keep liner thin at the inner corner, thickening outward.",
               "Blend shadow horizontally rather than up toward the brow.",
               "Skip liner on the lower inner third."]),
    Technique("deep_set_light", "Bringing a deep-set eye forward", ["eye_shape:deep_set"],
              ["Light, slightly shimmery shade across the lid.",
               "Keep the crease shade soft — deep colour there recedes further.",
               "Thin liner; a thick line closes the eye."]),
    Technique("thin_lip_fullness", "Adding apparent fullness to a thin lip", ["lip_shape:thin"],
              ["Line just on the outer edge of your natural line, not beyond it.",
               "Satin or gloss rather than matte.",
               "A dab of gloss at the centre of the lower lip."],
              "Overlining past the edge shows in daylight and in photos."),
    Technique("full_lip_definition", "Defining a full lip", ["lip_shape:full"],
              ["Line on the natural line.",
               "Matte or blotted finishes hold their shape.",
               "Blot and reapply rather than layering thickly."]),
    Technique("bow_balance", "Balancing an uneven lip", ["lip_shape:top_heavy", "lip_shape:bottom_heavy"],
              ["Build up the smaller lip slightly with liner.",
               "Keep the fuller lip on its natural line.",
               "Central gloss draws the eye to the middle, not the edges."]),
    Technique("blush_high", "Blush on high cheekbones", ["cheek_contour:high"],
              ["Place on the bone itself, sweeping toward the temple.",
               "Highlight above the blush, not on it."]),
    Technique("blush_soft", "Blush on soft cheeks", ["cheek_contour:soft"],
              ["Apple of the cheek, blended upward.",
               "Cream formulas sit more naturally than powder."]),
    Technique("soft_contrast_makeup", "Makeup for soft facial contrast", ["facial_contrast:soft"],
              ["Stay in the same depth register as your own colouring.",
               "Blend every edge — hard lines read as separate from the face.",
               "One focal point at a time."]),
    Technique("defined_contrast_makeup", "Makeup for defined facial contrast",
              ["facial_contrast:defined"],
              ["Match the contrast already on your face, or makeup disappears.",
               "Defined liner and a clear lip hold up.",
               "Very soft looks can read as unfinished on you."]),
    Technique("brow_straight", "Working with a straight brow", ["brow_shape:straight"],
              ["Brush hairs up at the head for height.",
               "Lift the tail slightly if you want more arch; do not draw a new peak."]),
    Technique("brow_defined", "Working with a defined arch", ["brow_shape:defined_arch"],
              ["Keep the peak where it sits.",
               "Powder rather than pencil softens a strong arch."]),
]


def techniques_for(attribute_key: str, option_key: str) -> list[Technique]:
    token = f"{attribute_key}:{option_key}"
    return [t for t in TECHNIQUES if token in t.applies_to]


# Foundation guidance: families, never a shade name. MyLookFit does not claim to
# match a bottle it cannot see.
FOUNDATION_GUIDE = {
    "howTo": [
        "Swatch three shades along your jaw, not your hand or your wrist.",
        "Check in daylight, by a window — store lighting is the usual culprit.",
        "The right one disappears at the jawline without blending.",
        "Skin changes by season; the shade that worked in winter may be light in summer.",
    ],
    "undertoneHint": {
        "warm": "Look for shades labelled warm, golden or W — your undertone reads warm.",
        "cool": "Look for shades labelled cool, rosy or C — your undertone reads cool.",
        "neutral": "Neutral or N shades tend to work; you can often wear either side.",
        "olive": "Look for olive or O shades; many neutral lines run too pink on olive skin.",
    },
    "disclaimer": (
        "MyLookFit names undertone and depth families only. It does not match "
        "specific products or exact foundation shades — that needs your skin and "
        "real light, not a photograph."
    ),
}
