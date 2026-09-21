"""The hairstyle, bangs and hair-colour library behind Hair Studio.

Static, version-controlled stylist knowledge — no AI call, no network, no cost.
Every style carries the facts a person actually needs before booking: what
length it starts from, which textures it suits, what it costs in upkeep and
morning minutes.

Two rules this file follows deliberately:

- Gender presentation is a styling preference the user states, never something
  inferred from a photograph. Most entries are tagged "any".
- Textures include coily and curly hair as first-class entries with protective
  styles, not as an afterthought appended to a straight-hair catalogue. Likewise
  Korean-inspired cuts appear as one tradition among several, not the default.
"""
from __future__ import annotations

from dataclasses import dataclass, field

LENGTHS = ("short", "medium", "long")
TEXTURES = ("straight", "wavy", "curly", "coily")
MAINTENANCE = ("low", "medium", "high")
PRESENTATIONS = ("feminine", "masculine", "any")


@dataclass(frozen=True)
class Hairstyle:
    key: str
    name: str
    length: str
    description: str
    textures: list[str]
    maintenance: str
    # Typical daily styling time in minutes.
    styling_minutes: int
    # Face shapes this cut tends to balance. Empty means it suits broadly.
    suits_shapes: list[str]
    presentation: str
    aesthetics: list[str]
    notes: str
    origin: str = "global"
    protective: bool = False


def _h(**kwargs) -> Hairstyle:
    return Hairstyle(**kwargs)


HAIRSTYLES: list[Hairstyle] = [
    # ------------------------------------------------------------------ short
    _h(key="pixie", name="Pixie", length="short",
       description="Cropped close at the back and sides with length left on top.",
       textures=["straight", "wavy", "curly"], maintenance="medium", styling_minutes=5,
       suits_shapes=["oval", "heart", "diamond", "inverted_triangle"], presentation="any",
       aesthetics=["Minimalist", "Contemporary", "Streetwear"],
       notes="Grows out quickly — plan a trim every five or six weeks to keep the shape."),
    _h(key="bob", name="Classic bob", length="short",
       description="Jaw-length all round, with a soft edge.",
       textures=["straight", "wavy"], maintenance="medium", styling_minutes=10,
       suits_shapes=["oval", "heart", "inverted_triangle", "triangle"], presentation="feminine",
       aesthetics=["Classic", "Minimalist", "Office"],
       notes="Sits differently on wavy hair; ask for a little internal weight removal."),
    _h(key="french_bob", name="French bob", length="short",
       description="A slightly shorter bob, usually with a soft fringe.",
       textures=["straight", "wavy"], maintenance="medium", styling_minutes=10,
       suits_shapes=["oval", "square", "rectangle"], presentation="feminine",
       aesthetics=["Vintage", "Romantic", "European-inspired"], origin="european",
       notes="The fringe is the commitment, not the length."),
    _h(key="blunt_bob", name="Blunt bob", length="short",
       description="One length, cut hard at the ends.",
       textures=["straight"], maintenance="high", styling_minutes=12,
       suits_shapes=["oval", "round", "heart"], presentation="feminine",
       aesthetics=["Minimalist", "Editorial", "Korean-inspired"],
       notes="Stays blunt for about six weeks; after that it reads as grown out."),
    _h(key="layered_bob", name="Layered bob", length="short",
       description="A bob with internal layers for movement.",
       textures=["straight", "wavy", "curly"], maintenance="medium", styling_minutes=10,
       suits_shapes=["round", "square", "rectangle", "triangle"], presentation="feminine",
       aesthetics=["Contemporary", "Casual"],
       notes="More forgiving as it grows than a blunt cut."),
    _h(key="textured_crop", name="Textured crop", length="short",
       description="Short all over with choppy, lifted texture on top.",
       textures=["straight", "wavy", "curly"], maintenance="low", styling_minutes=5,
       suits_shapes=["oval", "round", "square", "triangle"], presentation="any",
       aesthetics=["Streetwear", "Contemporary", "Minimalist"],
       notes="Works with a little paste; nothing else needed."),
    _h(key="crew_cut", name="Crew cut", length="short",
       description="Short and tapered, slightly longer at the front.",
       textures=["straight", "wavy", "curly", "coily"], maintenance="low", styling_minutes=2,
       suits_shapes=["oval", "square", "rectangle", "diamond"], presentation="masculine",
       aesthetics=["Classic", "Minimalist"],
       notes="The lowest-effort cut in the library, and the most frequent trim."),
    _h(key="fade", name="Fade", length="short",
       description="Graduated from skin at the neckline up into length on top.",
       textures=["straight", "wavy", "curly", "coily"], maintenance="high", styling_minutes=5,
       suits_shapes=["oval", "round", "square", "rectangle", "triangle"], presentation="masculine",
       aesthetics=["Streetwear", "Contemporary"],
       notes="Sharp for two weeks, soft by four. Upkeep is the whole decision."),
    _h(key="undercut", name="Undercut", length="short",
       description="Disconnected short sides under a longer top section.",
       textures=["straight", "wavy", "curly"], maintenance="medium", styling_minutes=6,
       suits_shapes=["oval", "round", "heart"], presentation="any",
       aesthetics=["Streetwear", "Editorial"],
       notes="The disconnection is deliberate; it does not blend as it grows."),
    _h(key="two_block", name="Two-block cut", length="short",
       description="Short back and sides under a fuller, rounded top.",
       textures=["straight", "wavy"], maintenance="medium", styling_minutes=8,
       suits_shapes=["oval", "rectangle", "oblong", "diamond"], presentation="any",
       aesthetics=["Korean-inspired", "Contemporary"], origin="korean",
       notes="One of several Korean-inspired cuts here, not the house default."),
    _h(key="buzz_cut", name="Buzz cut", length="short",
       description="One clipper length all over.",
       textures=["straight", "wavy", "curly", "coily"], maintenance="low", styling_minutes=1,
       suits_shapes=["oval", "square", "diamond"], presentation="any",
       aesthetics=["Minimalist"],
       notes="Nothing to style, and nothing to hide behind — the most honest cut there is."),
    _h(key="tapered_coils", name="Tapered coils", length="short",
       description="Natural coils kept full on top and tapered at the sides.",
       textures=["coily", "curly"], maintenance="medium", styling_minutes=10,
       suits_shapes=["oval", "round", "heart", "square"], presentation="any",
       aesthetics=["Contemporary", "Classic"],
       notes="Shape comes from the taper, so find a stylist who cuts coils dry."),

    # ----------------------------------------------------------------- medium
    _h(key="lob", name="Lob", length="medium",
       description="A long bob sitting at or just below the collarbone.",
       textures=["straight", "wavy"], maintenance="low", styling_minutes=8,
       suits_shapes=["oval", "round", "square", "heart", "rectangle"], presentation="feminine",
       aesthetics=["Classic", "Minimalist", "Office"],
       notes="The most forgiving length in the library as it grows."),
    _h(key="shoulder_layers", name="Shoulder-length layers", length="medium",
       description="Layers cut through a shoulder-length base for movement.",
       textures=["straight", "wavy", "curly"], maintenance="medium", styling_minutes=10,
       suits_shapes=["round", "square", "rectangle", "oblong", "triangle"], presentation="feminine",
       aesthetics=["Casual", "Contemporary", "Romantic"],
       notes="Ask where the shortest layer sits — that is what you will see daily."),
    _h(key="shag", name="Shag", length="medium",
       description="Heavily layered with a fringe and visible texture.",
       textures=["wavy", "curly"], maintenance="low", styling_minutes=8,
       suits_shapes=["oval", "square", "rectangle", "oblong"], presentation="any",
       aesthetics=["Vintage", "Streetwear", "Editorial"],
       notes="Looks better slightly undone, which makes it kind on busy mornings."),
    _h(key="wolf_cut", name="Wolf cut", length="medium",
       description="A shag and a mullet meeting — short crown, longer ends.",
       textures=["straight", "wavy", "curly"], maintenance="medium", styling_minutes=10,
       suits_shapes=["oval", "round", "heart", "diamond"], presentation="any",
       aesthetics=["Streetwear", "Editorial", "Korean-inspired"],
       notes="Strong shape. Bring a photo, because interpretations vary widely."),
    _h(key="butterfly_cut", name="Butterfly cut", length="medium",
       description="Long layers with shorter face-framing pieces that blend in.",
       textures=["straight", "wavy"], maintenance="medium", styling_minutes=12,
       suits_shapes=["oval", "round", "square", "rectangle"], presentation="feminine",
       aesthetics=["Contemporary", "Romantic"],
       notes="Designed to look like two lengths when curled, one when straight."),
    _h(key="hush_cut", name="Hush cut", length="medium",
       description="Soft, airy layers concentrated around the face.",
       textures=["straight", "wavy"], maintenance="low", styling_minutes=8,
       suits_shapes=["round", "square", "rectangle", "triangle"], presentation="feminine",
       aesthetics=["Korean-inspired", "Minimalist", "Romantic"], origin="korean",
       notes="Gentler than a wolf cut; grows out without a hard line."),
    _h(key="medium_curls", name="Medium curls", length="medium",
       description="Curls cut to sit at the shoulder with the shape kept round.",
       textures=["curly", "coily"], maintenance="medium", styling_minutes=15,
       suits_shapes=["oval", "square", "rectangle", "oblong"], presentation="any",
       aesthetics=["Casual", "Romantic", "Contemporary"],
       notes="Cut dry, curl by curl, or the shape lands somewhere unintended."),
    _h(key="twists", name="Two-strand twists", length="medium",
       description="Sections twisted into a protective, low-manipulation style.",
       textures=["coily", "curly"], maintenance="low", styling_minutes=5, protective=True,
       suits_shapes=[], presentation="any",
       aesthetics=["Casual", "Contemporary", "Classic"],
       notes="Installed over a few hours, worn for weeks — the time is upfront, not daily."),
    _h(key="box_braids", name="Box braids", length="medium",
       description="Sectioned braids, often with added length.",
       textures=["coily", "curly"], maintenance="low", styling_minutes=5, protective=True,
       suits_shapes=[], presentation="any",
       aesthetics=["Classic", "Streetwear", "Editorial"],
       notes="Keep the tension gentle at the hairline; a braid should never hurt."),

    # ------------------------------------------------------------------- long
    _h(key="long_layers", name="Long layers", length="long",
       description="Length kept with layers cut through for movement.",
       textures=["straight", "wavy", "curly"], maintenance="low", styling_minutes=10,
       suits_shapes=["round", "square", "rectangle", "triangle"], presentation="feminine",
       aesthetics=["Classic", "Romantic", "Casual"],
       notes="The safest way to keep length without it going flat."),
    _h(key="face_framing", name="Face-framing layers", length="long",
       description="Shorter pieces cut around the face over an otherwise long cut.",
       textures=["straight", "wavy", "curly"], maintenance="low", styling_minutes=10,
       suits_shapes=["round", "square", "oblong", "rectangle", "triangle"], presentation="any",
       aesthetics=["Contemporary", "Romantic", "Korean-inspired"],
       notes="The smallest change with the biggest visible difference."),
    _h(key="long_curls", name="Long curls", length="long",
       description="Curls kept long, shaped rather than thinned.",
       textures=["curly", "coily"], maintenance="medium", styling_minutes=20,
       suits_shapes=["oval", "oblong", "rectangle", "diamond"], presentation="any",
       aesthetics=["Romantic", "Classic"],
       notes="Weight pulls curl down; layers are what keep the pattern visible."),
    _h(key="u_cut", name="U-cut", length="long",
       description="Ends cut into a soft U, keeping the perimeter full.",
       textures=["straight", "wavy"], maintenance="low", styling_minutes=8,
       suits_shapes=["oval", "heart", "diamond"], presentation="feminine",
       aesthetics=["Classic", "Indian-traditional"], origin="indian",
       notes="A common ask in Indian salons; keeps length while softening the ends."),
    _h(key="v_cut", name="V-cut", length="long",
       description="Ends cut into a V, which makes the taper more visible.",
       textures=["straight", "wavy"], maintenance="low", styling_minutes=8,
       suits_shapes=["round", "square", "triangle"], presentation="feminine",
       aesthetics=["Classic", "Contemporary"],
       notes="Reads slimmer than a U-cut at the same length."),
    _h(key="straight_cut", name="One-length cut", length="long",
       description="A single blunt perimeter, no layers.",
       textures=["straight"], maintenance="medium", styling_minutes=10,
       suits_shapes=["oval", "heart", "inverted_triangle"], presentation="feminine",
       aesthetics=["Minimalist", "Classic", "Indian-traditional"],
       notes="Shows every split end, so trims matter more than with layers."),
    _h(key="locs", name="Locs", length="long",
       description="Hair allowed to lock into permanent ropes.",
       textures=["coily", "curly"], maintenance="low", styling_minutes=5, protective=True,
       suits_shapes=[], presentation="any",
       aesthetics=["Classic", "Contemporary", "Editorial"],
       notes="A long commitment with very low daily cost — the opposite trade to a fade."),
    _h(key="medium_flow", name="Grown-out flow", length="long",
       description="Length grown past the ears and worn pushed back.",
       textures=["straight", "wavy", "curly"], maintenance="low", styling_minutes=5,
       suits_shapes=["oval", "square", "diamond"], presentation="masculine",
       aesthetics=["Casual", "Vintage"],
       notes="The awkward stage is real and lasts about three months."),
]

HAIRSTYLE_BY_KEY = {h.key: h for h in HAIRSTYLES}


@dataclass(frozen=True)
class Bangs:
    key: str
    name: str
    description: str
    suits_shapes: list[str]
    textures: list[str]
    maintenance: str
    notes: str


BANGS: list[Bangs] = [
    Bangs("curtain", "Curtain bangs", "Parted in the middle and swept to both sides.",
          ["round", "square", "rectangle", "oblong", "heart", "triangle"],
          ["straight", "wavy", "curly"], "low",
          "The most forgiving fringe: it grows into face-framing layers rather than into your eyes."),
    Bangs("wispy", "Wispy bangs", "Fine, softly textured and see-through at the ends.",
          ["oval", "round", "heart", "diamond"], ["straight", "wavy"], "medium",
          "Needs fine to medium density; thick hair rarely sits this light."),
    Bangs("full", "Full bangs", "Dense and cut straight across the brow.",
          ["oval", "oblong", "rectangle", "diamond"], ["straight"], "high",
          "A trim every three weeks, and a changed morning routine. Commit deliberately."),
    Bangs("side_swept", "Side-swept bangs", "Longer and angled across the forehead.",
          ["round", "square", "rectangle", "triangle"], ["straight", "wavy", "curly"], "low",
          "The easiest fringe to grow out, because there is no hard line."),
    Bangs("see_through", "See-through bangs", "Sparse and deliberately gappy at the forehead.",
          ["oval", "round", "heart"], ["straight"], "medium",
          "Korean-inspired and light; it shows the forehead rather than hiding it."),
    Bangs("baby", "Baby bangs", "Cut well above the brow.",
          ["oval", "oblong", "rectangle"], ["straight", "wavy"], "high",
          "A strong statement. Two weeks of growth changes the whole look."),
    Bangs("face_framing", "Face-framing pieces", "Not a fringe — shorter strands left at the cheekbone.",
          ["round", "square", "rectangle", "triangle", "oblong"], ["straight", "wavy", "curly", "coily"], "low",
          "The lowest-risk way to test whether you want a fringe at all."),
    Bangs("none", "No fringe", "Length kept off the face entirely.",
          ["heart", "inverted_triangle", "diamond", "oval"], ["straight", "wavy", "curly", "coily"], "low",
          "Worth considering seriously: a fringe is the hardest cut to undo."),
]


@dataclass(frozen=True)
class HairColour:
    key: str
    name: str
    hex: str
    family: str  # brown | black | blonde | red | fashion
    # Which seasonal families this tends to sit with. Never a prohibition.
    warmth: str  # warm | cool | neutral
    lift_required: str  # none | low | medium | high
    maintenance: str
    notes: str


HAIR_COLOURS: list[HairColour] = [
    HairColour("chocolate_brown", "Chocolate brown", "#4a2f24", "brown", "warm", "low", "low",
               "A forgiving first colour: it grows out softly rather than showing a line."),
    HairColour("ash_brown", "Ash brown", "#5a4f47", "brown", "cool", "medium", "medium",
               "Ash tones fade warm. Expect a toning refresh every six to eight weeks."),
    HairColour("chestnut", "Chestnut", "#6b3f28", "brown", "warm", "low", "low",
               "Reads red in sunlight and brown indoors, which is much of its appeal."),
    HairColour("espresso", "Espresso", "#3b2a22", "brown", "neutral", "none", "low",
               "Close to most naturally dark hair, so growth is nearly invisible."),
    HairColour("soft_black", "Soft black", "#241f1d", "black", "neutral", "none", "low",
               "Softer against the skin than a true black, which can look flat in photos."),
    HairColour("blue_black", "Blue black", "#1b1f2a", "black", "cool", "none", "medium",
               "Striking on cool colouring; the blue fades before the black does."),
    HairColour("copper", "Copper", "#a8501f", "red", "warm", "medium", "high",
               "The fastest-fading family in the library. Cold rinses and colour-safe wash help."),
    HairColour("burgundy", "Burgundy", "#5c1f2b", "red", "cool", "medium", "medium",
               "Deep and cool; reads almost black indoors and clearly red in daylight."),
    HairColour("auburn", "Auburn", "#7c3218", "red", "warm", "medium", "medium",
               "Between chestnut and copper, and easier to maintain than either extreme."),
    HairColour("honey_blonde", "Honey blonde", "#b98a4b", "blonde", "warm", "high", "high",
               "On dark hair this is several sessions, not one. Budget for the upkeep first."),
    HairColour("ash_blonde", "Ash blonde", "#bfae96", "blonde", "cool", "high", "high",
               "The most demanding option here: high lift plus regular toning."),
    HairColour("caramel_balayage", "Caramel balayage", "#a6702f", "blonde", "warm", "medium", "low",
               "Painted rather than fully covered, so there is no regrowth line to chase."),
    HairColour("burgundy_fashion", "Deep violet", "#4a2b52", "fashion", "cool", "high", "high",
               "Fashion shades sit on top of lifted hair and fade with every wash."),
    HairColour("teal_fashion", "Teal", "#1f6f6a", "fashion", "cool", "high", "high",
               "Best on pre-lightened ends, where fading reads as intentional."),
]

HAIR_COLOUR_BY_KEY = {c.key: c for c in HAIR_COLOURS}

PARTINGS = [
    {"key": "centre", "name": "Centre part",
     "suits": ["oval", "square", "heart", "round"],
     "note": "Symmetrical and lengthening; emphasises whatever symmetry is already there."},
    {"key": "side", "name": "Side part",
     "suits": ["round", "square", "rectangle", "triangle", "inverted_triangle"],
     "note": "Breaks symmetry and adds diagonal movement, which softens a strong jaw."},
    {"key": "deep_side", "name": "Deep side part",
     "suits": ["round", "square", "oblong"],
     "note": "Maximum volume on one side. Needs retraining if your hair falls the other way."},
    {"key": "zigzag", "name": "Zig-zag part",
     "suits": ["oval", "round", "heart", "diamond"],
     "note": "Hides a thin parting line and adds root volume without product."},
]
