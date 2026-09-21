"""The Look Composition engine behind Create My Look.

This file composes; it does not recommend. Every recommendation still comes
from the engine that owns it — `outfit_rules` for garments, `hair_rules` for
cuts and colour, `makeup_rules` for looks, `accessories_rules` for jewellery,
`outfit_colors` for harmony. Nothing is duplicated and nothing is re-derived.

Three properties this file guarantees:

- **Every input is optional.** A user with no colour analysis, no face scan and
  no questionnaire still gets a complete, coherent look. It is simply explained
  by the occasion rather than by them, and says so.
- **Nothing is fabricated.** A missing personal colour produces an empty
  palette and an explicit prompt, never a plausible-looking invented swatch.
- **Replacing one component leaves the rest alone.** `apply_selection` returns
  a new composition with exactly one component changed.

Deterministic throughout. No AI call, no network, no per-request cost.
"""
from __future__ import annotations

from dataclasses import replace as _replace  # noqa: F401  (kept for slot edits)

from rules import accessories_rules, hair_rules, makeup_rules, outfit_colors, outfit_rules
from rules.fashion_library import GARMENT_BY_KEY
from rules.look_structures import (
    OCCASION_KEYS, STRUCTURE_BY_KEY, Slot, Structure, structures_for,
)
from rules.makeup_library import AESTHETIC_BY_KEY as MAKEUP_BY_KEY

# The components a look is made of, in builder order. Each is independently
# replaceable; nothing here cascades without saying so.
COMPONENTS = (
    "outfit", "colours", "hair", "hairColour", "makeup", "lipstick",
    "jewellery", "accessories", "footwear",
)

# How a recommendation was reached. Kept distinct so the UI can never present
# an occasion default as if it were personal analysis.
BASIS_PERSONAL_COLOUR = "personal_colour"
BASIS_FACE = "face_shape"
BASIS_PREFERENCE = "preference"
BASIS_OCCASION = "occasion"
BASIS_GENERAL = "general"

# Makeup and the fashion library disagree about occasion vocabulary; map rather
# than duplicate either list.
_MAKEUP_OCCASION = {
    "everyday": "everyday", "college": "everyday", "vacation": "everyday",
    "office": "work", "work": "work", "interview": "work",
    "date": "evening", "party": "evening", "evening": "evening",
    "formal": "evening",
    "wedding": "wedding", "indian_wedding": "wedding",
    "festival": "festival", "photoshoot": "photography",
}

# Which neckline a structure tends to present, so a necklace can be ordered
# against something real rather than guessed.
_STRUCTURE_NECKLINE = {
    "saree_set": "scoop", "lehenga_set": "sweetheart", "anarkali_set": "crew",
    "kurta_set": "mandarin", "salwar_set": "crew", "sharara_set": "scoop",
    "indo_western_set": "boat", "sherwani_set": "mandarin",
    "shirt_trouser": "collar", "top_jeans": "crew", "dress_look": "v_neck",
    "skirt_look": "v_neck", "coord_set": "crew", "layered_smart": "crew",
}

VISUALISATION_NOTE = hair_rules.VISUALISATION_DISCLAIMER

NO_PALETTE_NOTE = (
    "You have no colour analysis yet, so these are your colours to choose. "
    "Pick anything below, or run an analysis to see a palette built for you."
)


# ------------------------------------------------------------------ palette

def palette_for(context: dict) -> dict:
    """The colour pool a look draws from. Empty when nothing is known."""
    palettes = context.get("palettes") or {}
    return {
        "season": context.get("season"),
        "seasonLabel": context.get("seasonLabel"),
        "best": list(palettes.get("best") or []),
        "neutrals": list(palettes.get("neutrals") or []),
        "accents": list(palettes.get("accents") or []),
    }


def _colour_for(palette: dict, colour_role: str, index: int) -> dict | None:
    """One swatch for a slot, cycling so two slots rarely land on one colour."""
    pool = palette.get(colour_role) or palette.get("best") or []
    if not pool:
        return None
    return {**pool[index % len(pool)], "role": colour_role}


# ------------------------------------------------------------------- outfit

def _rank_slot(slot: Slot, context: dict, occasion: str | None,
               aesthetics: list[str], rejected: set[str]) -> list[dict]:
    """Candidates for one slot, best first, with rejected items demoted.

    The occasion filter is dropped when it would empty a slot. A saree blouse
    is not tagged "wedding" in its own right, and an outfit that cannot be
    completed is worse than a companion piece chosen without an occasion tag.
    """
    wanted_occasion = occasion if occasion in OCCASION_KEYS and occasion != "custom" else None

    def rank(with_occasion: str | None) -> dict[str, dict]:
        seen: dict[str, dict] = {}
        for category in slot.categories:
            for garment in outfit_rules.recommend_garments(
                body_type=context.get("effectiveBodyType"),
                aesthetics=aesthetics or context.get("aesthetics") or [],
                silhouettes=context.get("silhouettes") or [],
                fit_preference=context.get("fitPreference"),
                occasion=with_occasion,
                climate=context.get("climate"),
                cultural=context.get("cultural") or [],
                category=category,
            ):
                if slot.garment_keys and garment["key"] not in slot.garment_keys:
                    continue
                seen.setdefault(garment["key"], garment)
        return seen

    seen = rank(wanted_occasion)
    if not seen and wanted_occasion:
        seen = rank(None)

    candidates = list(seen.values())
    # A rejected item is pushed to the back, never removed: the user may still
    # want it for this particular look, and an empty list helps nobody.
    candidates.sort(key=lambda g: (g["key"] in rejected, -g["score"], g["name"]))
    return candidates


def _piece(slot: Slot, garment: dict, colour: dict | None) -> dict:
    return {
        "slot": slot.slot,
        "label": slot.label,
        "role": slot.role,
        "required": slot.required,
        "note": slot.note,
        "key": garment["key"],
        "name": garment["name"],
        "category": garment["category"],
        "region": garment["region"],
        "description": garment["description"],
        "silhouette": garment["silhouette"],
        "formality": garment["formality"],
        "styling": list(garment.get("styling") or []),
        "reasons": list(garment.get("reasons") or [])[:2],
        "colour": colour,
        "colourRole": slot.colour_role,
        "available": True,
    }


def build_outfit(structure: Structure, context: dict, *, occasion: str | None,
                 aesthetics: list[str], rejected: set[str]) -> dict | None:
    """Fill a structure's slots. None when a required slot cannot be filled."""
    palette = palette_for(context)
    pieces: list[dict] = []
    for index, slot in enumerate(structure.slots):
        candidates = _rank_slot(slot, context, occasion, aesthetics, rejected)
        if not candidates:
            if slot.required:
                return None
            continue
        pieces.append(_piece(slot, candidates[0], _colour_for(palette, slot.colour_role, index)))

    return {
        "structure": structure.key,
        "structureName": structure.name,
        "region": structure.region,
        "summary": structure.summary,
        "formality": structure.formality,
        "pieces": pieces,
    }


# --------------------------------------------------------------- hair, face

def _tokens(values: list[str] | None) -> set[str]:
    """Loose vocabulary match across libraries.

    Hair says "Indian-traditional" where the style library says "traditional".
    Comparing whole labels would find no overlap and quietly fall back to
    alphabetical order, so compare the words instead.
    """
    out: set[str] = set()
    for value in values or []:
        out.update(value.lower().replace("-", " ").replace("_", " ").split())
    return out


# Occasions that warrant more styling effort, used only to break ties between
# cuts the engine already rates equally.
_EFFORT_BY_FORMALITY = {"casual": 1, "smart_casual": 1, "business": 1,
                        "occasion": -1, "formal": -1}


def _hair_options(context: dict, aesthetics: list[str],
                  formality: str = "smart_casual",
                  rejected: set[str] | None = None) -> list[dict]:
    """Every cut the filters allow, ordered for this look.

    `recommend_hairstyles` leaves large ties — dozens of cuts suit an oval face
    equally — and resolving them alphabetically would open every single look
    with a buzz cut. The tie-breaks are the look's own aesthetic and then the
    occasion's effort level. Nothing is removed; the order changes.
    """
    rejected = rejected or set()
    styles = hair_rules.recommend_hairstyles(
        context.get("faceShape"),
        texture=context.get("hairTexture"),
        length=context.get("hairLength"),
        maintenance=context.get("maintenanceTolerance"),
        presentation=context.get("genderPresentation"),
    )
    wanted = _tokens(aesthetics) | _tokens(context.get("aesthetics"))
    effort = _EFFORT_BY_FORMALITY.get(formality, 1)
    styles.sort(key=lambda s: (
        s["key"] in rejected,
        -s.get("score", 0.0),
        not (wanted & _tokens(s.get("aesthetics"))),
        effort * s.get("stylingMinutes", 0),
        s["name"],
    ))
    return styles


def _spread_index(seed: str, size: int) -> int:
    """Deterministic pick within a group the engine rates equally."""
    if size <= 1:
        return 0
    value = 0
    for char in seed:
        value = (value * 31 + ord(char)) % 1_000_003
    return value % size


def _hair(context: dict, aesthetics: list[str], rejected: set[str],
          formality: str = "smart_casual", seed: str = "") -> dict:
    """The hair this look opens with.

    Where several cuts are rated identically — common when there is no face
    scan — one is picked deterministically from that tied group rather than
    always the alphabetically first, so three concepts show three cuts instead
    of the same one three times. Every cut stays in the alternatives list.
    """
    styles = _hair_options(context, aesthetics, formality, rejected)
    chosen = None
    if styles:
        leader = styles[0]
        wanted = _tokens(aesthetics) | _tokens(context.get("aesthetics"))
        leader_match = bool(wanted & _tokens(leader.get("aesthetics")))
        tied = [
            s for s in styles
            if s.get("score") == leader.get("score")
            and bool(wanted & _tokens(s.get("aesthetics"))) == leader_match
            and s["key"] not in rejected
        ] or [leader]
        chosen = tied[_spread_index(seed, len(tied))]
    return {
        "style": chosen["key"] if chosen else None,
        "styleName": chosen["name"] if chosen else None,
        "summary": chosen.get("description") if chosen else None,
        "length": chosen.get("length") if chosen else None,
        "maintenance": chosen.get("maintenance") if chosen else None,
        "disclaimer": VISUALISATION_NOTE,
        "available": chosen is not None,
    }


def _hair_colour(context: dict) -> dict:
    """Hair colour is offered only when there is a season to reason from."""
    season = context.get("season")
    if not season:
        return {
            "colour": None, "colourName": None, "lift": None,
            "offered": False,
            "note": "Hair colour suggestions need a colour analysis. Your current "
                    "colour works with every look here.",
        }
    colours = hair_rules.recommend_hair_colours(season)
    chosen = colours[0] if colours else None
    return {
        "colour": chosen["key"] if chosen else None,
        "colourName": chosen["name"] if chosen else None,
        "hex": chosen.get("hex") if chosen else None,
        "lift": chosen.get("liftRequired") if chosen else None,
        "offered": chosen is not None,
        "note": (chosen.get("notes") or None) if chosen else None,
    }


# ----------------------------------------------------------------- makeup

def _makeup(context: dict, *, occasion: str | None, rejected: set[str]) -> dict:
    makeup_occasion = _MAKEUP_OCCASION.get(occasion or "", None)
    ranked = makeup_rules.recommend_aesthetics(
        occasion=makeup_occasion,
        contrast=context.get("contrast"),
    )
    if not ranked:
        ranked = makeup_rules.recommend_aesthetics(contrast=context.get("contrast"))
    ranked.sort(key=lambda a: (a["key"] in rejected, -a.get("score", 0.0), a["name"]))
    if not ranked:
        return {"aesthetic": None, "available": False}

    chosen = ranked[0]
    look = makeup_rules.build_look(
        chosen["key"],
        season=context.get("season"),
        attributes=context.get("attributes") or {},
        occasion=makeup_occasion,
        undertone=context.get("undertone"),
    ) or {}
    return {
        "aesthetic": chosen["key"],
        "aestheticName": chosen["name"],
        "intensity": chosen.get("intensity"),
        "minutes": chosen.get("minutes"),
        "summary": chosen.get("summary"),
        "steps": list(look.get("steps") or [])[:4],
        "techniques": [t["name"] for t in (look.get("techniques") or [])][:4],
        "missingAttributes": list(look.get("missingAttributes") or []),
        "available": True,
    }


def _lipstick(context: dict) -> dict:
    """Lipstick comes from the colour report, or is left for the user to pick."""
    palettes = context.get("palettes") or {}
    options = list(palettes.get("lipstick") or [])
    if not options:
        return {"name": None, "hex": None, "offered": False, "note": NO_PALETTE_NOTE}
    chosen = options[0]
    return {
        "name": chosen["name"], "hex": chosen["hex"], "offered": True,
        "note": "Shade family, not a product match — brands number their shades "
                "differently and we do not guess.",
    }


# ------------------------------------------------------------- accessories

def _jewellery(context: dict, structure: Structure, rejected: set[str]) -> dict:
    metals = accessories_rules.recommend_metals(
        context.get("undertone"), context.get("seasonFamily"))
    earrings = accessories_rules.recommend("earrings", context.get("faceShape"))
    earrings.sort(key=lambda e: (e["key"] in rejected, -e["score"], e["name"]))
    neckline = _STRUCTURE_NECKLINE.get(structure.key)
    necklaces = accessories_rules.recommend_necklaces(neckline)
    necklaces.sort(key=lambda n: (n["key"] in rejected, -n["score"], n["name"]))

    return {
        "metal": metals[0]["key"] if metals else None,
        "metalName": metals[0]["name"] if metals else None,
        "metalHex": metals[0].get("hex") if metals else None,
        "earrings": earrings[0]["key"] if earrings else None,
        "earringsName": earrings[0]["name"] if earrings else None,
        "necklace": necklaces[0]["key"] if necklaces else None,
        "necklaceName": necklaces[0]["name"] if necklaces else None,
        "neckline": neckline,
        "available": bool(metals or earrings),
    }


def _accessories(context: dict, structure: Structure, rejected: set[str]) -> list[dict]:
    """Hair accessories and the like. Relevance, never assumption.

    A traditional structure surfaces traditional hair accessories because the
    *outfit* calls for them — not because of anything about the person.
    """
    items = accessories_rules.recommend("hair_accessories", context.get("faceShape"))
    if structure.region == "indian":
        items.sort(key=lambda i: (i["key"] in rejected, i["origin"] != "indian", i["name"]))
    else:
        items.sort(key=lambda i: (i["key"] in rejected, i["origin"] != "global", i["name"]))
    chosen = items[:1]
    return [{
        "category": "hair_accessories",
        "key": item["key"],
        "name": item["name"],
        "description": item["description"],
        "origin": item["origin"],
    } for item in chosen]


# ------------------------------------------------------------ explanations

def _explanations(context: dict, outfit: dict, hair: dict, makeup: dict,
                  lipstick: dict, jewellery: dict, occasion: str | None) -> list[dict]:
    """Why each component appears, with the basis named rather than implied."""
    out: list[dict] = []

    def add(component: str, basis: str, text: str) -> None:
        out.append({"component": component, "basis": basis, "text": text})

    if context.get("season"):
        add("colours", BASIS_PERSONAL_COLOUR,
            f"These colours come from your {context['seasonLabel']} palette.")
    else:
        add("colours", BASIS_GENERAL, NO_PALETTE_NOTE)

    piece_reason = next((p["reasons"][0] for p in outfit["pieces"] if p["reasons"]), None)
    if context.get("effectiveBodyType"):
        add("outfit", BASIS_PREFERENCE,
            f"Ordered for the {context['effectiveBodyType'].replace('_', ' ')} "
            "shape you selected. Nothing was hidden from you.")
    elif context.get("aesthetics"):
        add("outfit", BASIS_PREFERENCE,
            f"Chosen against the aesthetics you saved: {', '.join(context['aesthetics'][:2])}.")
    elif occasion and occasion != "custom":
        add("outfit", BASIS_OCCASION,
            f"Based on the occasion alone — {occasion.replace('_', ' ')} — because "
            "you have not told us your preferences yet.")
    elif piece_reason:
        add("outfit", BASIS_GENERAL, piece_reason)

    if context.get("fitPreference"):
        add("outfit", BASIS_PREFERENCE,
            f"You said you prefer a {context['fitPreference'].replace('_', ' ')} fit.")

    if hair.get("available"):
        if context.get("faceShape"):
            add("hair", BASIS_FACE,
                f"Ordered for your {context['faceShape']} face shape. Every cut in the "
                "library stayed available.")
        elif context.get("hairTexture"):
            add("hair", BASIS_PREFERENCE,
                f"Filtered to {context['hairTexture']} hair, which you told us.")
        else:
            add("hair", BASIS_GENERAL,
                "No face scan yet, so this is a broadly wearable cut. Filter by "
                "length and texture to narrow it yourself.")

    if makeup.get("available"):
        if context.get("contrast"):
            add("makeup", BASIS_FACE,
                f"Your {context['contrast']} facial contrast points at this intensity.")
        elif occasion:
            add("makeup", BASIS_OCCASION, "Chosen for the occasion, not from your features.")
        if makeup.get("missingAttributes"):
            add("makeup", BASIS_GENERAL,
                "Confirm your eye, brow and lip shapes to get technique specific to you.")

    if lipstick.get("offered"):
        add("lipstick", BASIS_PERSONAL_COLOUR, "Drawn from your personal lipstick palette.")

    if jewellery.get("metalName"):
        if context.get("undertone"):
            add("jewellery", BASIS_PERSONAL_COLOUR,
                f"{jewellery['metalName']} sits with your {context['undertone']} undertone. "
                "The other metals are still yours to wear.")
        else:
            add("jewellery", BASIS_GENERAL,
                "Metal is a preference, not a rule. Both suit most people.")

    return out


# -------------------------------------------------------------- composition

def personalisation_level(context: dict) -> str:
    """quick | personalised | full — how much of this look is actually theirs."""
    signals = [
        bool(context.get("season")),
        bool(context.get("faceShape")),
        bool(context.get("hairTexture")),
        bool(context.get("aesthetics")),
        bool(context.get("bodyType")),
        bool(context.get("fitPreference")),
    ]
    count = sum(signals)
    if count == 0:
        return "quick"
    return "full" if count >= 4 else "personalised"


def compose(
    structure_key: str,
    context: dict,
    *,
    occasion: str | None = None,
    aesthetics: list[str] | None = None,
    rejected: set[str] | None = None,
    name: str | None = None,
) -> dict | None:
    """One complete look. None when the structure cannot actually be filled."""
    structure = STRUCTURE_BY_KEY.get(structure_key)
    if structure is None:
        return None

    aesthetics = aesthetics or []
    rejected = rejected or set()

    outfit = build_outfit(structure, context, occasion=occasion,
                          aesthetics=aesthetics, rejected=rejected)
    if outfit is None:
        return None

    hair = _hair(context, aesthetics, rejected, structure.formality,
                 seed=f"{structure.key}:{occasion or ''}")
    hair_colour = _hair_colour(context)
    makeup = _makeup(context, occasion=occasion, rejected=rejected)
    lipstick = _lipstick(context)
    jewellery = _jewellery(context, structure, rejected)
    accessories = _accessories(context, structure, rejected)
    palette = palette_for(context)

    footwear = next((p for p in outfit["pieces"] if p["role"] == "footwear"), None)
    primary_aesthetic = (aesthetics or context.get("aesthetics") or [None])[0]

    return {
        "name": name or f"{structure.name} for {(occasion or 'any occasion').replace('_', ' ')}",
        "occasion": occasion,
        "aesthetic": primary_aesthetic,
        "structure": structure.key,
        "personalisation": personalisation_level(context),
        "outfit": outfit,
        "colours": {
            **palette,
            "harmony": _harmony(outfit),
            "note": None if palette["season"] else NO_PALETTE_NOTE,
        },
        "hair": hair,
        "hairColour": hair_colour,
        "makeup": makeup,
        "lipstick": lipstick,
        "jewellery": jewellery,
        "accessories": accessories,
        "footwear": footwear,
        "preferencesUsed": list(context.get("used") or []),
        "missingProfile": list(context.get("missing") or []),
        "explanations": _explanations(context, outfit, hair, makeup, lipstick,
                                      jewellery, occasion),
    }


def _harmony(outfit: dict) -> dict | None:
    """How the two most visible garment colours relate. None without colours."""
    coloured = [p for p in outfit["pieces"] if p.get("colour")]
    if len(coloured) < 2:
        return None
    first, second = coloured[0], coloured[1]
    relationship = outfit_colors.describe_pair(first["colour"]["hex"], second["colour"]["hex"])
    return {
        "roles": [first["label"], second["label"]],
        "colours": [first["colour"], second["colour"]],
        **relationship,
    }


def generate(
    context: dict,
    *,
    occasion: str | None = None,
    aesthetics: list[str] | None = None,
    regions: list[str] | None = None,
    rejected: set[str] | None = None,
    limit: int = 3,
) -> list[dict]:
    """Several distinct look concepts for one brief."""
    looks = []
    for structure in structures_for(occasion, regions=regions):
        look = compose(structure.key, context, occasion=occasion,
                       aesthetics=aesthetics, rejected=rejected)
        if look is not None:
            looks.append(look)
        if len(looks) >= limit:
            break
    return looks


# ------------------------------------------------------------- alternatives

def alternatives(component: str, composition: dict, context: dict, *,
                 slot: str | None = None, limit: int = 12) -> list[dict]:
    """Replacements for one component, without touching anything else."""
    structure = STRUCTURE_BY_KEY.get(composition.get("structure", ""))
    occasion = composition.get("occasion")

    if component == "outfit":
        if structure is None:
            return []
        target = next((s for s in structure.slots if s.slot == slot), None)
        if target is None:
            return []
        ranked = _rank_slot(target, context, occasion,
                            composition.get("aesthetic") and [composition["aesthetic"]] or [],
                            set())
        return [{"key": g["key"], "name": g["name"], "detail": g["description"],
                 "meta": g["category"], "reasons": g.get("reasons", [])[:1]}
                for g in ranked[:limit]]

    if component == "colours":
        palette = palette_for(context)
        pool = palette["best"] + palette["neutrals"] + palette["accents"]
        return [{"key": c["hex"], "name": c["name"], "detail": c["hex"], "meta": "colour"}
                for c in pool[:limit]]

    if component == "hair":
        structure_formality = structure.formality if structure else "smart_casual"
        aesthetic = [composition["aesthetic"]] if composition.get("aesthetic") else []
        ordered = _hair_options(context, aesthetic, structure_formality)
        styles = ordered[:limit]
        return [{"key": s["key"], "name": s["name"], "detail": s["description"],
                 "meta": s.get("length"), "reasons": s.get("reasons", [])[:1]}
                for s in styles]

    if component == "hairColour":
        # Without a season there is nothing to reason from, and a list of every
        # dye in the library would be a guess dressed up as a recommendation.
        if not context.get("season"):
            return []
        colours = hair_rules.recommend_hair_colours(context.get("season"))
        return [{"key": c["key"], "name": c["name"], "detail": c.get("notes"),
                 "meta": c.get("liftRequired")} for c in colours[:limit]]

    if component == "makeup":
        ranked = makeup_rules.recommend_aesthetics(contrast=context.get("contrast"))
        return [{"key": a["key"], "name": a["name"], "detail": a["summary"],
                 "meta": f"{a['minutes']} min"} for a in ranked[:limit]]

    if component == "lipstick":
        options = (context.get("palettes") or {}).get("lipstick") or []
        return [{"key": c["hex"], "name": c["name"], "detail": c["hex"], "meta": "lipstick"}
                for c in options[:limit]]

    if component == "jewellery":
        metals = accessories_rules.recommend_metals(
            context.get("undertone"), context.get("seasonFamily"))
        earrings = accessories_rules.recommend("earrings", context.get("faceShape"))
        neckline = _STRUCTURE_NECKLINE.get(structure.key) if structure else None
        necklaces = accessories_rules.recommend_necklaces(neckline)
        return (
            [{"key": m["key"], "name": m["name"], "detail": m["note"], "meta": "metal"}
             for m in metals]
            + [{"key": e["key"], "name": e["name"], "detail": e["description"],
                "meta": "earrings"} for e in earrings[:limit]]
            + [{"key": n["key"], "name": n["name"], "detail": n["description"],
                "meta": "necklace"} for n in necklaces[:limit]]
        )

    if component == "accessories":
        items = accessories_rules.recommend("hair_accessories", context.get("faceShape"))
        return [{"key": i["key"], "name": i["name"], "detail": i["description"],
                 "meta": i["origin"]} for i in items[:limit]]

    if component == "footwear":
        ranked = outfit_rules.recommend_garments(
            occasion=occasion if occasion != "custom" else None,
            category="footwear", limit=limit)
        return [{"key": g["key"], "name": g["name"], "detail": g["description"],
                 "meta": g["formality"]} for g in ranked]

    return []


# ---------------------------------------------------------------- selection

def apply_selection(composition: dict, component: str, selection: dict) -> dict:
    """Return a new composition with one component changed. Never mutates."""
    if component == "outfit":
        slot = selection.get("slot")
        garment = GARMENT_BY_KEY.get(selection.get("key", ""))
        if garment is None or slot is None:
            return composition
        pieces = [
            {**p, "key": garment.key, "name": garment.name, "category": garment.category,
             "region": garment.region, "description": garment.description,
             "silhouette": garment.silhouette, "formality": garment.formality,
             "styling": list(garment.styling), "reasons": [], "available": True}
            if p["slot"] == slot else p
            for p in composition["outfit"]["pieces"]
        ]
        outfit = {**composition["outfit"], "pieces": pieces}
        updated = {**composition, "outfit": outfit,
                   "colours": {**composition["colours"], "harmony": _harmony(outfit)}}
        footwear = next((p for p in pieces if p["role"] == "footwear"), None)
        return {**updated, "footwear": footwear}

    if component == "colours":
        slot = selection.get("slot")
        colour = selection.get("colour")
        if slot is None or not colour:
            return composition
        pieces = [{**p, "colour": colour} if p["slot"] == slot else p
                  for p in composition["outfit"]["pieces"]]
        outfit = {**composition["outfit"], "pieces": pieces}
        footwear = next((p for p in pieces if p["role"] == "footwear"), None)
        return {**composition, "outfit": outfit, "footwear": footwear,
                "colours": {**composition["colours"], "harmony": _harmony(outfit)}}

    if component == "hair":
        style = hair_rules.HAIRSTYLE_BY_KEY.get(selection.get("key", ""))
        if style is None:
            return composition
        return {**composition, "hair": {
            **composition["hair"], "style": style.key, "styleName": style.name,
            "summary": style.description, "length": style.length,
            "maintenance": style.maintenance, "available": True,
        }}

    if component == "hairColour":
        colour = hair_rules.colour_by_key(selection.get("key", ""))
        if colour is None:
            return composition
        return {**composition, "hairColour": {
            **composition["hairColour"], "colour": colour.key, "colourName": colour.name,
            "hex": colour.hex, "lift": colour.lift_required, "offered": True,
        }}

    if component == "makeup":
        aesthetic = MAKEUP_BY_KEY.get(selection.get("key", ""))
        if aesthetic is None:
            return composition
        return {**composition, "makeup": {
            **composition["makeup"], "aesthetic": aesthetic.key,
            "aestheticName": aesthetic.name, "intensity": aesthetic.intensity,
            "minutes": aesthetic.minutes, "summary": aesthetic.summary,
            "steps": list(aesthetic.signature)[:4], "available": True,
        }}

    if component == "lipstick":
        return {**composition, "lipstick": {
            **composition["lipstick"],
            "name": selection.get("name"), "hex": selection.get("key"), "offered": True,
        }}

    if component == "jewellery":
        kind = selection.get("kind")
        item = accessories_rules.item(selection.get("key", ""))
        jewellery = dict(composition["jewellery"])
        if kind == "metal":
            metal = next((m for m in accessories_rules.recommend_metals()
                          if m["key"] == selection.get("key")), None)
            if metal is None:
                return composition
            jewellery.update(metal=metal["key"], metalName=metal["name"],
                             metalHex=metal.get("hex"))
        elif kind in ("earrings", "necklace") and item is not None:
            jewellery.update(**{kind: item.key, f"{kind}Name": item.name})
        else:
            return composition
        return {**composition, "jewellery": jewellery}

    if component == "accessories":
        item = accessories_rules.item(selection.get("key", ""))
        if item is None:
            return composition
        return {**composition, "accessories": [{
            "category": item.category, "key": item.key, "name": item.name,
            "description": item.description, "origin": item.origin,
        }]}

    if component == "footwear":
        return apply_selection(composition, "outfit",
                               {"slot": "footwear", "key": selection.get("key")})

    return composition


# ------------------------------------------------------------ smart shifts

SHIFTS = (
    {"key": "more_casual", "label": "More casual",
     "detail": "Same idea, softer formality."},
    {"key": "more_formal", "label": "More formal",
     "detail": "Same idea, dressed up."},
    {"key": "softer_makeup", "label": "Softer makeup",
     "detail": "Less intensity, same look."},
    {"key": "bolder_makeup", "label": "Bolder makeup",
     "detail": "More intensity, same look."},
    {"key": "new_colours", "label": "Different colours",
     "detail": "Rotate the palette through the outfit."},
    {"key": "new_hair", "label": "Another hairstyle",
     "detail": "Only the hair changes."},
)

_FORMALITY_LADDER = ("casual", "smart_casual", "business", "occasion", "formal")
_INTENSITY_LADDER = ("bare", "soft", "defined", "bold")


def _step(ladder: tuple[str, ...], value: str | None, direction: int) -> str | None:
    if value not in ladder:
        return None
    index = max(0, min(len(ladder) - 1, ladder.index(value) + direction))
    return ladder[index]


def shift(composition: dict, context: dict, kind: str) -> dict:
    """A targeted variation. Everything the shift does not name is preserved."""
    if kind in ("more_casual", "more_formal"):
        direction = -1 if kind == "more_casual" else 1
        current = composition["outfit"]["formality"]
        if current not in _FORMALITY_LADDER:
            return composition
        here = _FORMALITY_LADDER.index(current)
        # Nearest structure in the requested direction, not an exact step: a
        # wedding has nothing one rung down, and returning the same look would
        # silently ignore the user.
        moved = sorted(
            (s for s in structures_for(composition.get("occasion"))
             if s.key != composition["structure"]
             and s.formality in _FORMALITY_LADDER
             and (_FORMALITY_LADDER.index(s.formality) - here) * direction > 0),
            key=lambda s: abs(_FORMALITY_LADDER.index(s.formality) - here),
        )
        for structure in moved:
            rebuilt = compose(
                structure.key, context,
                occasion=composition.get("occasion"),
                aesthetics=[composition["aesthetic"]] if composition.get("aesthetic") else [],
            )
            if rebuilt is None:
                continue
            # Hair, makeup and jewellery are the user's choices; only the
            # outfit shifts, because only the outfit was asked about.
            return {**rebuilt,
                    "hair": composition["hair"],
                    "hairColour": composition["hairColour"],
                    "makeup": composition["makeup"],
                    "lipstick": composition["lipstick"],
                    "jewellery": composition["jewellery"],
                    "name": composition["name"]}
        return composition

    if kind in ("softer_makeup", "bolder_makeup"):
        direction = -1 if kind == "softer_makeup" else 1
        wanted = _step(_INTENSITY_LADDER, composition["makeup"].get("intensity"), direction)
        ranked = makeup_rules.recommend_aesthetics(intensity=wanted) if wanted else []
        if not ranked:
            return composition
        return apply_selection(composition, "makeup", {"key": ranked[0]["key"]})

    if kind == "new_colours":
        palette = palette_for(context)
        if not palette["best"]:
            return composition
        pieces = composition["outfit"]["pieces"]
        rotated = []
        for index, piece in enumerate(pieces):
            colour = _colour_for(palette, piece["colourRole"], index + 1)
            rotated.append({**piece, "colour": colour} if colour else piece)
        outfit = {**composition["outfit"], "pieces": rotated}
        return {**composition, "outfit": outfit,
                "footwear": next((p for p in rotated if p["role"] == "footwear"), None),
                "colours": {**composition["colours"], "harmony": _harmony(outfit)}}

    if kind == "new_hair":
        structure = STRUCTURE_BY_KEY.get(composition.get("structure", ""))
        options = _hair_options(
            context,
            [composition["aesthetic"]] if composition.get("aesthetic") else [],
            structure.formality if structure else "smart_casual",
        )
        others = [o for o in options if o["key"] != composition["hair"].get("style")]
        if not others:
            return composition
        return apply_selection(composition, "hair", {"key": others[0]["key"]})

    return composition
