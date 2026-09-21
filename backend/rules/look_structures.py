"""Outfit structures for Create My Look.

A structure describes the *shape* of an outfit, not its contents. A saree is a
drape plus a blouse; jeans are a top plus a bottom; a dress is one piece. They
are not the same schema and this file refuses to pretend they are — which is
why a lehenga can carry a dupatta slot that a shirt-and-trouser look simply
does not have.

Slots name categories from the existing fashion library. Nothing new is
invented here: every `garment_keys` entry resolves against `GARMENT_BY_KEY`,
and a structure whose required slots cannot be filled is never offered.
"""
from __future__ import annotations

from dataclasses import dataclass, field, replace

from rules.fashion_library import GARMENT_BY_KEY

# Where a slot sits in the look. Used by the builder to group editors and by
# the visual composition to decide what to draw.
SLOT_ROLES = ("main", "layer", "bottom", "drape", "footwear", "bag")


@dataclass(frozen=True)
class Slot:
    """One replaceable position in an outfit."""

    slot: str
    label: str
    role: str
    # Candidate categories from the fashion library, in preference order.
    categories: tuple[str, ...]
    # Narrows further when a category holds garments of very different kinds
    # (the `traditional` category holds sarees, lehengas and sherwanis alike).
    garment_keys: tuple[str, ...] = ()
    required: bool = True
    # Which part of the season palette this slot draws from.
    colour_role: str = "best"
    note: str = ""


@dataclass(frozen=True)
class Structure:
    key: str
    name: str
    region: str
    summary: str
    formality: str
    occasions: tuple[str, ...]
    slots: tuple[Slot, ...]
    aesthetics: tuple[str, ...] = field(default_factory=tuple)


def _s(slot, label, role, categories, *, keys=(), required=True,
       colour_role="best", note="") -> Slot:
    return Slot(slot=slot, label=label, role=role, categories=tuple(categories),
                garment_keys=tuple(keys), required=required,
                colour_role=colour_role, note=note)


_FOOTWEAR = _s("footwear", "Footwear", "footwear", ["footwear"], colour_role="neutrals")
_BAG = _s("bag", "Bag", "bag", ["bags"], required=False, colour_role="neutrals")
_DUPATTA = _s("dupatta", "Dupatta", "drape", ["accessories"], keys=["dupatta"],
              colour_role="accents",
              note="It sits closest to your face, so it carries the most colour weight.")

SAREES = ("saree_silk", "saree_cotton", "saree_georgette")
LEHENGAS = ("lehenga_aline", "lehenga_mermaid", "lehenga_panelled")

STRUCTURES: list[Structure] = [
    # ------------------------------------------------------------ Indian
    Structure(
        key="saree_set", name="Saree", region="indian",
        summary="A drape, a blouse and very little else.",
        formality="occasion", occasions=("wedding", "indian_wedding", "festival", "formal", "party"),
        aesthetics=("traditional", "elegant"),
        slots=(
            _s("drape", "Saree", "main", ["traditional"], keys=SAREES),
            _s("blouse", "Blouse", "layer", ["tops"], colour_role="accents",
               note="A contrast blouse restyles a saree you already own."),
            _FOOTWEAR,
            _BAG,
        ),
    ),
    Structure(
        key="lehenga_set", name="Lehenga", region="indian",
        summary="Skirt, blouse and dupatta, styled as one.",
        formality="occasion", occasions=("wedding", "indian_wedding", "festival", "party"),
        aesthetics=("traditional", "indo_western"),
        slots=(
            _s("skirt", "Lehenga", "main", ["traditional"], keys=LEHENGAS),
            _s("blouse", "Blouse", "layer", ["tops"], colour_role="accents"),
            _DUPATTA,
            _FOOTWEAR,
            _BAG,
        ),
    ),
    Structure(
        key="anarkali_set", name="Anarkali", region="indian",
        summary="One long flared piece, with a dupatta over it.",
        formality="occasion", occasions=("wedding", "indian_wedding", "festival", "party", "formal"),
        aesthetics=("traditional", "romantic"),
        slots=(
            _s("main", "Anarkali", "main", ["traditional"], keys=["anarkali"]),
            replace(_DUPATTA, required=False),
            _FOOTWEAR,
            _BAG,
        ),
    ),
    Structure(
        key="kurta_set", name="Kurta and bottom", region="indian",
        summary="A kurta over trousers, palazzos or a dhoti.",
        formality="smart_casual", occasions=("everyday", "college", "office", "work", "festival"),
        aesthetics=("traditional", "indo_western", "minimalist"),
        slots=(
            _s("kurta", "Kurta", "main", ["traditional"], keys=["kurta_straight", "kurta_aline"]),
            _s("bottom", "Bottom", "bottom", ["trousers"], colour_role="neutrals",
               note="A neutral bottom lets the kurta carry the colour."),
            replace(_DUPATTA, required=False),
            _FOOTWEAR,
            _BAG,
        ),
    ),
    Structure(
        key="salwar_set", name="Salwar suit", region="indian",
        summary="A coordinated three-piece set.",
        formality="smart_casual", occasions=("everyday", "office", "work", "festival", "college"),
        aesthetics=("traditional",),
        slots=(
            _s("main", "Salwar suit", "main", ["traditional"], keys=["salwar_suit"]),
            replace(_DUPATTA, required=False),
            _FOOTWEAR,
        ),
    ),
    Structure(
        key="sharara_set", name="Sharara or gharara", region="indian",
        summary="Wide flared legs under a short kurta.",
        formality="occasion", occasions=("wedding", "indian_wedding", "festival", "party"),
        aesthetics=("traditional", "romantic"),
        slots=(
            _s("main", "Sharara or gharara", "main", ["traditional"], keys=["sharara", "gharara"]),
            _DUPATTA,
            _FOOTWEAR,
            _BAG,
        ),
    ),
    Structure(
        key="indo_western_set", name="Indo-Western", region="indian",
        summary="Traditional fabric, contemporary cut.",
        formality="occasion", occasions=("party", "festival", "evening", "wedding", "photoshoot"),
        aesthetics=("indo_western", "contemporary"),
        slots=(
            _s("main", "Indo-Western piece", "main", ["traditional"], keys=["indo_western"]),
            _s("layer", "Jacket", "layer", ["jackets"], keys=["nehru_jacket", "cropped_jacket"],
               required=False, colour_role="neutrals"),
            _FOOTWEAR,
        ),
    ),
    Structure(
        key="sherwani_set", name="Sherwani", region="indian",
        summary="A structured long coat over fitted trousers.",
        formality="occasion", occasions=("wedding", "indian_wedding", "formal"),
        aesthetics=("traditional", "formal"),
        slots=(
            _s("main", "Sherwani", "main", ["traditional"], keys=["sherwani"]),
            _s("footwear", "Footwear", "footwear", ["footwear"], keys=["juttis", "loafers"],
               colour_role="neutrals"),
        ),
    ),
    # ------------------------------------------------------------ Global
    Structure(
        key="shirt_trouser", name="Shirt and trousers", region="global",
        summary="The interview answer, and most of the office ones.",
        formality="business", occasions=("office", "work", "interview", "formal"),
        aesthetics=("classic", "minimalist", "formal"),
        slots=(
            _s("top", "Shirt", "main", ["shirts", "tops"]),
            _s("bottom", "Trousers", "bottom", ["trousers"], colour_role="neutrals"),
            _s("layer", "Blazer", "layer", ["blazers"], required=False, colour_role="neutrals"),
            _FOOTWEAR,
            _BAG,
        ),
    ),
    Structure(
        key="top_jeans", name="Top and jeans", region="global",
        summary="Three pieces, no decisions.",
        formality="casual", occasions=("everyday", "college", "vacation", "date"),
        aesthetics=("casual", "streetwear", "minimalist"),
        slots=(
            _s("top", "Top", "main", ["tops"]),
            _s("bottom", "Jeans", "bottom", ["jeans"], colour_role="neutrals"),
            _s("layer", "Jacket", "layer", ["jackets"], required=False, colour_role="neutrals"),
            _FOOTWEAR,
            _BAG,
        ),
    ),
    Structure(
        key="dress_look", name="Dress", region="global",
        summary="One statement piece and very little else.",
        formality="smart_casual",
        occasions=("date", "party", "evening", "wedding", "office", "photoshoot"),
        aesthetics=("romantic", "elegant", "classic"),
        slots=(
            _s("main", "Dress", "main", ["dresses"]),
            _s("layer", "Jacket", "layer", ["jackets", "blazers"], required=False,
               colour_role="neutrals"),
            _FOOTWEAR,
            _BAG,
        ),
    ),
    Structure(
        key="skirt_look", name="Skirt and top", region="global",
        summary="A defined waist with a softer hem.",
        formality="smart_casual", occasions=("office", "work", "everyday", "date", "college"),
        aesthetics=("classic", "romantic", "contemporary"),
        slots=(
            _s("top", "Top", "main", ["tops", "shirts"]),
            _s("bottom", "Skirt", "bottom", ["skirts"], colour_role="neutrals"),
            _s("layer", "Jacket", "layer", ["jackets", "blazers"], required=False,
               colour_role="neutrals"),
            _FOOTWEAR,
            _BAG,
        ),
    ),
    Structure(
        key="coord_set", name="Coordinated set", region="global",
        summary="A matching set, which is one decision instead of three.",
        formality="casual", occasions=("everyday", "vacation", "college", "photoshoot"),
        aesthetics=("minimalist", "contemporary", "casual"),
        slots=(
            _s("main", "Set", "main", ["sets"]),
            _s("layer", "Outer layer", "layer", ["outerwear", "jackets"], required=False,
               colour_role="neutrals"),
            _FOOTWEAR,
            _BAG,
        ),
    ),
    Structure(
        key="layered_smart", name="Layered smart", region="global",
        summary="A long layer over a simple base.",
        formality="smart_casual", occasions=("work", "office", "everyday", "formal"),
        aesthetics=("minimalist", "classic", "contemporary"),
        slots=(
            _s("top", "Top", "main", ["tops"]),
            _s("bottom", "Trousers", "bottom", ["trousers"], colour_role="neutrals"),
            _s("layer", "Coat", "layer", ["outerwear"], colour_role="neutrals"),
            _FOOTWEAR,
            _BAG,
        ),
    ),
]

STRUCTURE_BY_KEY = {s.key: s for s in STRUCTURES}

# Occasions Create My Look offers. `custom` carries the user's own words and is
# matched against no rule, so it never silently becomes something else.
OCCASIONS = (
    {"key": "everyday", "label": "Everyday", "formality": "casual"},
    {"key": "college", "label": "College", "formality": "casual"},
    {"key": "office", "label": "Office", "formality": "business"},
    {"key": "interview", "label": "Interview", "formality": "business"},
    {"key": "date", "label": "Date", "formality": "smart_casual"},
    {"key": "wedding", "label": "Wedding", "formality": "occasion"},
    {"key": "indian_wedding", "label": "Indian wedding", "formality": "occasion"},
    {"key": "festival", "label": "Festival", "formality": "occasion"},
    {"key": "party", "label": "Party", "formality": "smart_casual"},
    {"key": "vacation", "label": "Vacation", "formality": "casual"},
    {"key": "photoshoot", "label": "Photoshoot", "formality": "occasion"},
    {"key": "formal", "label": "Formal event", "formality": "formal"},
    {"key": "custom", "label": "Something else", "formality": "smart_casual"},
)

OCCASION_KEYS = tuple(o["key"] for o in OCCASIONS)


def slot_candidates(slot: Slot) -> tuple[str, ...]:
    """The garment keys a slot may hold, in the order the library declares them."""
    if slot.garment_keys:
        return tuple(k for k in slot.garment_keys if k in GARMENT_BY_KEY)
    return ()


def structures_for(
    occasion: str | None = None,
    *,
    regions: list[str] | None = None,
) -> list[Structure]:
    """Structures worth offering for an occasion.

    Region narrows only when the user asked it to. With no preference stated,
    both traditions are offered — a person's clothing tradition is a stated
    preference, never a guess.
    """
    wanted = {r for r in (regions or []) if r in ("indian", "global")}
    pool = [s for s in STRUCTURES if not wanted or s.region in wanted]
    if not pool:
        pool = list(STRUCTURES)
    if not occasion or occasion == "custom":
        return pool

    tagged = [s for s in pool if occasion in s.occasions]
    rest = [s for s in pool if s not in tagged]
    return tagged + rest
