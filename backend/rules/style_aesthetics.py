"""Fashion aesthetics and the optional style discovery quiz.

Nobody is one aesthetic. The quiz returns a ranked set and the user keeps as
many as they like — the scoring exists to start a conversation, not to file
someone under a label.

Nothing here is inferred from a photograph. Cultural aesthetics are offered to
everyone: a user in Delhi is not assumed to want Traditional, and a user in
Berlin is not assumed to want Minimalist.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Aesthetic:
    key: str
    name: str
    summary: str
    signature: list[str]
    # Garment keys that typify the look, for the visual explorer.
    hero_garments: list[str]
    formality: str
    effort: str  # low | medium | high
    region: str = "global"
    palette_hint: str = ""


AESTHETICS: list[Aesthetic] = [
    Aesthetic("minimalist", "Minimalist", "Few pieces, clean lines, nothing decorative.",
              ["Solid colours", "Unbroken silhouettes", "Quality over quantity",
               "Neutral base with one accent"],
              ["shift_dress", "high_waist_trousers", "white_sneakers", "longline_coat"],
              "smart_casual", "low", palette_hint="neutrals"),
    Aesthetic("classic", "Classic", "Shapes that have outlasted every trend cycle.",
              ["Tailored fits", "Timeless cuts", "Considered proportions", "Real fabrics"],
              ["blazer_tailored", "button_shirt", "trench", "loafers"],
              "business", "medium", palette_hint="neutrals"),
    Aesthetic("elegant", "Elegant", "Formal ease, with the work hidden.",
              ["Fluid fabrics", "Long lines", "One focal point", "Restrained jewellery"],
              ["silk_blouse", "saree_silk", "slip_dress", "block_heels"],
              "formal", "medium", palette_hint="best"),
    Aesthetic("contemporary", "Contemporary", "Current shapes without chasing a trend.",
              ["Relaxed tailoring", "Interesting proportions", "Mixed textures"],
              ["wide_trousers", "blazer_oversized", "co_ord_set", "indo_western"],
              "smart_casual", "medium", palette_hint="best"),
    Aesthetic("streetwear", "Streetwear", "Volume, comfort and a deliberate edge.",
              ["Oversized layers", "Trainers as the anchor", "Graphic or texture interest"],
              ["wide_jeans", "blazer_oversized", "white_sneakers", "tshirt"],
              "casual", "low", palette_hint="accents"),
    Aesthetic("casual", "Casual", "Clothes that do not ask anything of you.",
              ["Soft fabrics", "Easy fits", "Flat shoes", "Layers you can shed"],
              ["tshirt", "straight_jeans", "denim_jacket", "white_sneakers"],
              "casual", "low", palette_hint="best"),
    Aesthetic("romantic", "Romantic", "Softness, movement and detail.",
              ["Flowing fabrics", "Gathered or flared shapes", "Delicate detail"],
              ["fit_flare_dress", "anarkali", "cropped_jacket", "modest_maxi"],
              "smart_casual", "medium", palette_hint="best"),
    Aesthetic("vintage", "Vintage", "A decade's shapes, worn now.",
              ["Defined waists", "Period silhouettes", "Considered accessories"],
              ["fit_flare_dress", "gharara", "silk_scarf", "cropped_jacket"],
              "smart_casual", "high", palette_hint="accents"),
    Aesthetic("preppy", "Preppy", "Neat, collegiate and lightly formal.",
              ["Collars", "Pleats", "Knitwear", "Flat leather shoes"],
              ["button_shirt", "pleated_skirt", "loafers", "blazer_tailored"],
              "smart_casual", "medium", palette_hint="neutrals"),
    Aesthetic("business_casual", "Business Casual", "Professional without a full suit.",
              ["Tailored bottoms", "A soft top", "One structured layer"],
              ["high_waist_trousers", "silk_blouse", "blazer_tailored", "tote"],
              "business", "medium", palette_hint="neutrals"),
    Aesthetic("formal", "Formal", "Occasion dressing, fully committed.",
              ["Floor or full length", "Structured or fully fluid", "Nothing casual left in"],
              ["saree_silk", "sherwani", "lehenga_aline", "blazer_tailored"],
              "occasion", "high", palette_hint="best"),
    Aesthetic("athleisure", "Athleisure", "Performance clothing worn as clothing.",
              ["Technical fabrics", "Fitted or relaxed, rarely between", "Trainers"],
              ["athleisure_set", "knit_set", "white_sneakers", "tshirt"],
              "casual", "low", palette_hint="neutrals"),
    Aesthetic("indo_western", "Indo-Western", "Indian fabrics and forms, contemporary cuts.",
              ["Traditional textiles in modern shapes", "Mixed references, on purpose"],
              ["indo_western", "dhoti_pants", "nehru_jacket", "kurta_straight"],
              "smart_casual", "medium", region="indian", palette_hint="best"),
    Aesthetic("traditional", "Traditional", "Indian dress worn as it is meant to be.",
              ["Drapes and full sets", "Regional weaves", "Occasion jewellery"],
              ["saree_silk", "lehenga_aline", "anarkali", "juttis"],
              "occasion", "high", region="indian", palette_hint="best"),
    Aesthetic("korean", "Korean-Inspired", "Soft layering and gentle proportions.",
              ["Loose over fitted", "Muted palettes", "Pleats and knits", "Understated"],
              ["pleated_skirt", "knit_set", "co_ord_set", "blazer_oversized"],
              "smart_casual", "low", region="global", palette_hint="neutrals"),
    Aesthetic("modest", "Modest Fashion", "Full coverage, fully styled.",
              ["Long sleeves and hems", "Layered rather than tight", "Fabric doing the work"],
              ["modest_maxi", "abaya_style", "palazzo", "salwar_suit"],
              "smart_casual", "low", palette_hint="best"),
]

AESTHETIC_BY_KEY = {a.key: a for a in AESTHETICS}
AESTHETIC_KEYS = tuple(a.key for a in AESTHETICS)


@dataclass(frozen=True)
class QuizOption:
    key: str
    label: str
    # Aesthetic key -> weight. Several aesthetics can score from one answer,
    # because real preferences overlap.
    scores: dict[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class QuizQuestion:
    key: str
    prompt: str
    help_text: str
    multi: bool
    options: list[QuizOption]


QUIZ: list[QuizQuestion] = [
    QuizQuestion(
        "outfits", "Which of these would you actually wear?",
        "Pick as many as appeal. There is no wrong combination.", True,
        [
            QuizOption("tailored", "Tailored trousers and a crisp shirt",
                       {"classic": 2, "business_casual": 2, "preppy": 1}),
            QuizOption("flowing", "A flowing dress or anarkali",
                       {"romantic": 2, "elegant": 1.5, "traditional": 1}),
            QuizOption("oversized", "Oversized denim and trainers",
                       {"streetwear": 2, "casual": 1.5, "contemporary": 1}),
            QuizOption("saree", "A saree or full traditional set",
                       {"traditional": 2.5, "elegant": 1, "formal": 1}),
            QuizOption("monochrome", "One colour, head to toe",
                       {"minimalist": 2.5, "contemporary": 1}),
            QuizOption("layered", "Soft layers over something fitted",
                       {"korean": 2, "modest": 1, "contemporary": 1}),
            QuizOption("kurta_jeans", "A kurta with jeans",
                       {"indo_western": 2.5, "casual": 1}),
            QuizOption("sporty", "Leggings and a technical jacket",
                       {"athleisure": 2.5, "casual": 1}),
        ],
    ),
    QuizQuestion(
        "fit", "How do you like clothes to sit?",
        "This is comfort, not body shape.", False,
        [
            QuizOption("fitted", "Close to the body", {"elegant": 1.5, "classic": 1, "athleisure": 1}),
            QuizOption("semi", "Skimming, not clinging", {"classic": 1.5, "contemporary": 1.5}),
            QuizOption("relaxed", "Loose and easy", {"casual": 1.5, "korean": 1.5, "modest": 1.5}),
            QuizOption("oversized", "Deliberately oversized", {"streetwear": 2, "contemporary": 1}),
        ],
    ),
    QuizQuestion(
        "expression", "Simple, or expressive?",
        None or "Neither is more stylish than the other.", False,
        [
            QuizOption("very_simple", "As plain as possible", {"minimalist": 2.5, "classic": 1}),
            QuizOption("simple", "Mostly simple, one detail", {"minimalist": 1, "contemporary": 1.5}),
            QuizOption("expressive", "Colour, print and detail", {"romantic": 1.5, "traditional": 1.5,
                                                                  "vintage": 1.5}),
            QuizOption("bold", "As much as I can carry", {"streetwear": 1.5, "vintage": 1.5,
                                                          "formal": 1}),
        ],
    ),
    QuizQuestion(
        "occasions", "What do you dress for most?",
        "Pick everything that is a regular part of your week.", True,
        [
            QuizOption("work", "Work or study", {"business_casual": 2, "preppy": 1, "classic": 1}),
            QuizOption("everyday", "Errands and everyday life", {"casual": 2, "athleisure": 1}),
            QuizOption("social", "Going out", {"contemporary": 1.5, "streetwear": 1, "elegant": 1}),
            QuizOption("festive", "Festivals and weddings",
                       {"traditional": 2, "formal": 1.5, "indo_western": 1}),
        ],
    ),
    QuizQuestion(
        "effort", "How much time do you want to spend?",
        "An aesthetic you cannot maintain is not really yours.", False,
        [
            QuizOption("minutes", "A few minutes", {"minimalist": 1.5, "casual": 1.5,
                                                    "athleisure": 1.5, "korean": 1}),
            QuizOption("some", "A little thought", {"contemporary": 1.5, "business_casual": 1,
                                                    "classic": 1}),
            QuizOption("lots", "I enjoy the process", {"vintage": 2, "traditional": 1.5,
                                                       "formal": 1.5, "elegant": 1}),
        ],
    ),
    QuizQuestion(
        "coverage", "Any coverage preferences?",
        "Entirely optional, and it changes what we suggest rather than what we allow.", False,
        [
            QuizOption("none", "No particular preference", {}),
            QuizOption("modest", "I prefer fuller coverage", {"modest": 3, "traditional": 1}),
            QuizOption("varies", "Depends on the occasion", {"contemporary": 0.5}),
        ],
    ),
]

QUIZ_BY_KEY = {q.key: q for q in QUIZ}


def score_quiz(answers: dict[str, list[str] | str]) -> list[dict]:
    """Rank aesthetics from quiz answers. Returns every aesthetic, scored.

    Unanswered questions simply contribute nothing, so a half-finished quiz
    still produces a usable ranking.
    """
    totals: dict[str, float] = {key: 0.0 for key in AESTHETIC_KEYS}

    for question in QUIZ:
        answer = answers.get(question.key)
        if not answer:
            continue
        chosen = answer if isinstance(answer, list) else [answer]
        for option_key in chosen:
            option = next((o for o in question.options if o.key == option_key), None)
            if option is None:
                continue
            for aesthetic_key, weight in option.scores.items():
                if aesthetic_key in totals:
                    totals[aesthetic_key] += weight

    ranked = [
        {
            "key": a.key,
            "name": a.name,
            "summary": a.summary,
            "signature": list(a.signature),
            "heroGarments": list(a.hero_garments),
            "formality": a.formality,
            "effort": a.effort,
            "region": a.region,
            "score": round(totals[a.key], 2),
        }
        for a in AESTHETICS
    ]
    ranked.sort(key=lambda r: (-r["score"], r["name"]))
    return ranked


def top_aesthetics(answers: dict, limit: int = 3) -> list[str]:
    """The keys worth suggesting. Anything scoring zero is not suggested."""
    return [r["key"] for r in score_quiz(answers) if r["score"] > 0][:limit]


def serialise(aesthetic: Aesthetic) -> dict:
    return {
        "key": aesthetic.key,
        "name": aesthetic.name,
        "summary": aesthetic.summary,
        "signature": list(aesthetic.signature),
        "heroGarments": list(aesthetic.hero_garments),
        "formality": aesthetic.formality,
        "effort": aesthetic.effort,
        "region": aesthetic.region,
        "paletteHint": aesthetic.palette_hint,
    }
