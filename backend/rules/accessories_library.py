"""Glasses, earrings, necklines, metals and hair accessories.

Shape guidance here is the conventional stylist heuristic — contrast with the
face's dominant lines — stated as a tendency, never a rule and never a
correction. Indian jewellery forms sit beside Western ones as equals, because a
jhumka is not a regional variant of a drop earring.
"""
from __future__ import annotations

from dataclasses import dataclass

CATEGORIES = ("glasses", "earrings", "necklaces", "necklines", "metals", "hair_accessories")


@dataclass(frozen=True)
class Accessory:
    key: str
    name: str
    category: str
    description: str
    suits_shapes: list[str]
    note: str = ""
    origin: str = "global"


def _a(key, name, category, description, suits, note="", origin="global") -> Accessory:
    return Accessory(key=key, name=name, category=category, description=description,
                     suits_shapes=suits, note=note, origin=origin)


GLASSES = [
    _a("rectangle", "Rectangular", "glasses", "Straight top line, wider than tall.",
       ["round", "oval", "heart", "diamond"],
       "Angles contrast with a softer face outline."),
    _a("round_frames", "Round", "glasses", "Fully circular lenses.",
       ["square", "rectangle", "oblong", "triangle"],
       "Curves soften a strong jaw or brow line."),
    _a("cat_eye", "Cat-eye", "glasses", "Upswept outer corners.",
       ["round", "square", "oval", "triangle"],
       "Lifts the outer edge of the frame line."),
    _a("aviator", "Aviator", "glasses", "Teardrop lenses under a straight brow bar.",
       ["square", "heart", "oblong", "rectangle"]),
    _a("wayfarer", "Wayfarer", "glasses", "Thick, slightly trapezoidal frames.",
       ["oval", "round", "heart", "diamond"]),
    _a("oversized", "Oversized", "glasses", "Large frames covering brow to cheekbone.",
       ["oblong", "rectangle", "square"],
       "Width across the frame balances a longer face."),
    _a("browline", "Browline", "glasses", "Heavy top rim, light lower rim.",
       ["oval", "round", "triangle"],
       "Draws the eye upward toward the brow."),
    _a("rimless", "Rimless", "glasses", "Lenses with no visible frame.",
       ["diamond", "heart", "oval", "round"],
       "Adds the least visual weight of anything here."),
    _a("geometric", "Geometric", "glasses", "Hexagonal or angular non-standard shapes.",
       ["round", "oval", "heart"]),
]

EARRINGS = [
    _a("studs", "Studs", "earrings", "Sit flush against the lobe.",
       ["oval", "round", "square", "heart", "diamond", "oblong", "rectangle", "triangle",
        "inverted_triangle"],
       "Work with every face shape; the safe default."),
    _a("small_hoops", "Small hoops", "earrings", "Close to the lobe, under an inch.",
       ["oblong", "rectangle", "heart", "diamond"]),
    _a("large_hoops", "Large hoops", "earrings", "Wide circles extending past the jaw.",
       ["oblong", "rectangle", "heart", "inverted_triangle"],
       "Add width at the jaw, which balances a longer face."),
    _a("drops", "Drop earrings", "earrings", "A single element hanging below the lobe.",
       ["round", "square", "oblong"],
       "Length draws the eye downward."),
    _a("teardrop", "Teardrop", "earrings", "Wider at the base than the top.",
       ["heart", "inverted_triangle", "diamond"],
       "Weight at the bottom balances a wider forehead."),
    _a("chandelier", "Chandelier", "earrings", "Tiered and wide at the base.",
       ["oblong", "rectangle", "heart"]),
    _a("jhumka", "Jhumka", "earrings", "A domed bell, often with fringe along the rim.",
       ["oblong", "rectangle", "heart", "inverted_triangle"],
       "The bell adds width at jaw level. A staple across Indian jewellery traditions.",
       origin="indian"),
    _a("chandbali", "Chandbali", "earrings", "A crescent moon form, usually layered.",
       ["oval", "oblong", "rectangle", "diamond"],
       "Wide and curved; reads formal and holds up in photographs.", origin="indian"),
    _a("jhumki_studs", "Jhumki studs", "earrings", "A small jhumka sized close to the lobe.",
       ["round", "square", "heart", "oval"], origin="indian"),
    _a("ear_cuff", "Ear cuff", "earrings", "Wraps the upper ear rather than the lobe.",
       ["oval", "diamond", "heart"]),
    _a("threader", "Threaders", "earrings", "A fine chain drawn through the lobe.",
       ["round", "square", "oval"],
       "Vertical line without visual weight."),
    _a("kaan_chain", "Ear chain", "earrings", "A chain running from the earring to the hair.",
       ["oval", "heart", "diamond"],
       "Worn for weddings and festivals across South Asia.", origin="indian"),
]

NECKLINES = [
    _a("v_neck", "V-neck", "necklines", "An open V at the collarbone.",
       ["round", "square", "oblong", "triangle"],
       "A vertical line below the jaw."),
    _a("scoop", "Scoop", "necklines", "A wide, rounded opening.",
       ["square", "rectangle", "heart", "diamond"]),
    _a("crew", "Crew", "necklines", "Close and round at the base of the neck.",
       ["oval", "heart", "inverted_triangle"]),
    _a("boat", "Boat neck", "necklines", "Wide across the collarbones.",
       ["oblong", "rectangle", "triangle"],
       "Adds horizontal width across the shoulders."),
    _a("sweetheart", "Sweetheart", "necklines", "A curved double scoop.",
       ["square", "rectangle", "oblong"]),
    _a("collar", "Collared", "necklines", "A structured shirt collar.",
       ["round", "oval", "heart"]),
    _a("halter", "Halter", "necklines", "Ties or straps behind the neck.",
       ["square", "round", "rectangle"]),
    _a("mandarin", "Mandarin collar", "necklines", "A short stand collar.",
       ["oblong", "oval", "diamond"],
       "Common on kurtas and bandhgalas; lengthens the neckline visually.",
       origin="indian"),
]

NECKLACES = [
    _a("pendant", "Fine pendant", "necklaces", "A single drop on a thin chain.", [],
       "Disappears under a high neckline; give it an open one."),
    _a("choker", "Choker", "necklaces", "Sits close at the base of the neck.", [],
       "Wants an open or wide neckline to sit against."),
    _a("layered_chains", "Layered chains", "necklaces",
       "Two or three lengths worn together.", [],
       "Vary the lengths or they read as one tangled chain."),
    _a("pearl_strand", "Pearl strand", "necklaces", "A single uniform row.", [],
       "Reads formal; a knotted strand reads less so."),
    _a("statement_collar", "Statement collar", "necklaces",
       "Wide and structured across the collarbones.", [],
       "It is the outfit's focal point, so keep the earrings quiet."),
    _a("kundan_choker", "Kundan choker", "necklaces",
       "Uncut stones set in gold foil, worn at the throat.", [],
       "Traditionally paired with a longer second piece at weddings.",
       origin="indian"),
    _a("rani_haar", "Rani haar", "necklaces",
       "A long ceremonial chain that falls past the choker line.", [],
       "Worn over a choker rather than instead of one.", origin="indian"),
    _a("temple_necklace", "Temple jewellery", "necklaces",
       "Cast motifs in high-purity gold, from South Indian temple traditions.", [],
       "Classically worn with silk sarees.", origin="indian"),
    _a("oxidised_statement", "Oxidised statement piece", "necklaces",
       "Darkened silver, often tribal or contemporary in form.", [],
       "Sits as well with linen and cotton as with a kurta.", origin="indian"),
    _a("no_necklace", "No necklace", "necklaces",
       "Earrings alone, and nothing at the throat.", [],
       "The right answer whenever the neckline is already doing the work."),
]

# Which necklaces have room to sit against which neckline. Coordination only —
# nothing here is forbidden, and `no_necklace` is always available.
NECKLACE_BY_NECKLINE: dict[str, list[str]] = {
    "v_neck": ["pendant", "layered_chains", "rani_haar"],
    "scoop": ["choker", "statement_collar", "kundan_choker", "pearl_strand"],
    "crew": ["no_necklace", "pendant"],
    "boat": ["choker", "kundan_choker", "no_necklace"],
    "sweetheart": ["choker", "pendant", "kundan_choker"],
    "collar": ["no_necklace", "pendant"],
    "halter": ["no_necklace", "statement_collar"],
    "mandarin": ["no_necklace", "rani_haar"],
}

METALS = [
    {"key": "gold", "name": "Yellow gold", "hex": "#d4af37", "warmth": "warm",
     "note": "Sits with warm and golden undertones."},
    {"key": "rose_gold", "name": "Rose gold", "hex": "#c98d7f", "warmth": "warm",
     "note": "Warm with a pink cast; forgiving across undertones."},
    {"key": "silver", "name": "Silver", "hex": "#c0c5c9", "warmth": "cool",
     "note": "Sits with cool and rosy undertones."},
    {"key": "platinum", "name": "Platinum / white gold", "hex": "#dfe3e6", "warmth": "cool",
     "note": "Brighter and cooler than silver."},
    {"key": "oxidised", "name": "Oxidised silver", "hex": "#8b8d8f", "warmth": "cool",
     "note": "Matte and darkened; a staple of Indian tribal and contemporary jewellery."},
    {"key": "mixed", "name": "Mixed metals", "hex": "#b9a68c", "warmth": "neutral",
     "note": "Wearing both is a choice, not a mistake."},
]

HAIR_ACCESSORIES = [
    _a("claw_clip", "Claw clip", "hair_accessories", "Holds length up in seconds.", []),
    _a("silk_scarf", "Silk scarf", "hair_accessories", "Tied at the base or round the crown.", []),
    _a("headband", "Headband", "hair_accessories", "Padded or plain, across the crown.",
       ["oblong", "rectangle"], "Adds height, which suits a longer face less than a shorter one."),
    _a("bobby_pins", "Decorative pins", "hair_accessories", "Placed to show, not to hide.", []),
    _a("maang_tikka", "Maang tikka", "hair_accessories",
       "A pendant on a chain along the parting.", [],
       "Worn at weddings and festivals across South Asia.", origin="indian"),
    _a("hair_parandi", "Parandi", "hair_accessories",
       "A tasselled braid extension woven into a plait.", [],
       "Traditional in Punjab and neighbouring regions.", origin="indian"),
    _a("gajra", "Gajra", "hair_accessories",
       "A string of fresh flowers worn round a bun or braid.", [], origin="indian"),
    _a("satin_scrunchie", "Satin scrunchie", "hair_accessories",
       "Gentler on the hair shaft than elastic.", [],
       "Worth it if you tie your hair up daily."),
    _a("silk_bonnet", "Silk bonnet", "hair_accessories",
       "Worn overnight to keep moisture in and friction out.", [],
       "Standard care for curly, coily and protective styles."),
]

ALL_ACCESSORIES = GLASSES + EARRINGS + NECKLACES + NECKLINES + HAIR_ACCESSORIES
ACCESSORY_BY_KEY = {a.key: a for a in ALL_ACCESSORIES}
