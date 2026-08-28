"""Deterministic face-shape -> styling guidance.

Static domain knowledge (stylist conventions). Editable, version-controlled,
no DB/network. Keyed on the `shape` produced by ml/face_analysis.py
(oval | round | square | heart | oblong | diamond).
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FaceShapeGuide:
    summary: str
    goals: list[str]
    hairstyles: list[str]
    avoid_hairstyles: list[str]
    necklines: list[str]
    avoid_necklines: list[str]
    glasses: list[str]
    earrings: list[str]
    makeup: list[str]
    beard: list[str]


FACE_SHAPE_GUIDES: dict[str, FaceShapeGuide] = {
    "oval": FaceShapeGuide(
        summary="Balanced proportions; the most versatile shape — most styles work.",
        goals=["Maintain natural balance", "Avoid covering the face too much"],
        hairstyles=["Blunt lob", "Side part medium length", "Textured crop",
                    "Curtain bangs", "Long layers"],
        avoid_hairstyles=["Heavy full fringe that shortens the face"],
        necklines=["Crew", "V-neck", "Boat", "Scoop"],
        avoid_necklines=[],
        glasses=["Square", "Rectangular", "Wayfarer", "Geometric"],
        earrings=["Studs", "Drops", "Hoops"],
        makeup=["Light, even contour — proportions already balanced",
                "Blush on the apples of the cheeks"],
        beard=["Most styles suit", "Short boxed beard", "Light stubble"],
    ),
    "round": FaceShapeGuide(
        summary="Soft curves, width approximately equals length. Goal: add length and definition.",
        goals=["Lengthen the face", "Add angles/definition", "Add height on top"],
        hairstyles=["Volume on top / quiff", "Long layers past the chin",
                    "Side-swept fringe", "Pompadour"],
        avoid_hairstyles=["Chin-length rounded bob", "Blunt full fringe",
                          "Center curtain styles that widen"],
        necklines=["V-neck", "Sweetheart", "Deep scoop"],
        avoid_necklines=["Crew neck", "Boat neck", "Turtleneck"],
        glasses=["Rectangular", "Angular", "Wayfarer"],
        earrings=["Long drops", "Linear dangles", "Angular shapes"],
        makeup=["Contour the sides of cheeks and jaw to slim",
                "Blush angled toward temples", "Highlight chin and forehead center"],
        beard=["Short on sides, longer at chin (elongates)", "Goatee",
               "Soul patch with goatee"],
    ),
    "square": FaceShapeGuide(
        summary="Strong jaw, angular. Goal: soften corners, add curves.",
        goals=["Soften the jawline", "Add roundness/movement"],
        hairstyles=["Soft layers", "Side-swept fringe", "Waves/curls",
                    "Rounded edges around the jaw"],
        avoid_hairstyles=["Blunt straight cuts at jaw length", "Hard geometric lines"],
        necklines=["Scoop", "Round/crew", "Cowl", "Sweetheart"],
        avoid_necklines=["Square neckline", "Boat neck"],
        glasses=["Round", "Oval", "Rimless"],
        earrings=["Hoops", "Round studs", "Curved drops"],
        makeup=["Soften jaw corners with contour", "Round, slightly-high blush",
                "Keep brows softly arched, not sharp"],
        beard=["Rounded beard to soften jaw", "Circle beard",
               "Avoid sharp chin straps"],
    ),
    "heart": FaceShapeGuide(
        summary="Wider forehead, narrow chin. Goal: balance top width with the jaw.",
        goals=["Add width at the jaw/chin", "Reduce forehead emphasis"],
        hairstyles=["Chin-length styles", "Side part", "Layers starting at the chin",
                    "Wispy fringe"],
        avoid_hairstyles=["Heavy volume on top", "Slicked-back styles",
                          "Short blunt fringe"],
        necklines=["Boat", "Crew", "Cowl"],
        avoid_necklines=["Deep V", "Halter"],
        glasses=["Bottom-heavy frames", "Round", "Light/rimless on top", "Aviator"],
        earrings=["Teardrop (wider at bottom)", "Chandelier"],
        makeup=["Contour temples/forehead sides", "Blush on apples",
                "Highlight and subtly widen the chin"],
        beard=["Fuller beard to add chin width", "Avoid thin/pointed styles"],
    ),
    "oblong": FaceShapeGuide(
        summary="Longer than wide. Goal: add width, shorten the appearance.",
        goals=["Add width at the sides", "Avoid adding height",
               "Break vertical length"],
        hairstyles=["Side-swept or blunt fringe", "Waves and volume at the sides",
                    "Chin-to-shoulder length with body"],
        avoid_hairstyles=["Long straight flat hair", "Extra height on top"],
        necklines=["Crew", "Boat", "Turtleneck", "Cowl"],
        avoid_necklines=["Deep V", "Long pendant lines"],
        glasses=["Tall/deep frames", "Oversized", "Decorative temples (add width)"],
        earrings=["Studs", "Round buttons", "Short wide shapes"],
        makeup=["Horizontal blush across cheeks", "Contour under chin and hairline",
                "Avoid heavy vertical highlight"],
        beard=["Fuller on the cheeks/sides", "Avoid long goatees that lengthen"],
    ),
    "diamond": FaceShapeGuide(
        summary="Narrow forehead and jaw, wide cheekbones. Goal: widen forehead/chin.",
        goals=["Add width at forehead and jaw", "Soften cheekbone dominance"],
        hairstyles=["Fringe to widen forehead", "Chin-length volume", "Side parts"],
        avoid_hairstyles=["Slicked-back", "Tight high buns that expose cheek width"],
        necklines=["Boat", "Cowl", "Crew"],
        avoid_necklines=["Deep V"],
        glasses=["Oval", "Rimless", "Cat-eye (lifts to forehead)", "Top-heavy frames"],
        earrings=["Studs / hugging styles", "Wider-at-top shapes"],
        makeup=["Highlight forehead and chin", "Soften cheekbone with light contour"],
        beard=["Fuller jaw beard to widen chin", "Light cheek coverage"],
    ),
}

DEFAULT_GUIDE = FACE_SHAPE_GUIDES["oval"]


def guide_for(face_shape: str | None) -> FaceShapeGuide:
    """Return the guide for a shape, falling back to the oval default."""
    return FACE_SHAPE_GUIDES.get((face_shape or "").lower(), DEFAULT_GUIDE)
