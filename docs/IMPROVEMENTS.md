# VibeFit — Analysis Engine Improvements

Reference doc for planned improvements to the ML analysis pipeline and
recommendation system. Each item is tackled one at a time, in priority order.

**Status legend:** 🔴 not started · 🟡 in progress · 🟢 done

| # | Priority | Item | Status |
|---|----------|------|--------|
| 1 | HIGH | Deterministic face-shape → style rules layer | 🟢 done |
| 2 | HIGH | Fix `color_analysis` skin sampling (patch avg, true cheek points) | 🟢 done |
| 3 | HIGH | Real ML-pipeline tests (image → analysis) + fix test fixtures | 🟢 done |
| 4 | MED | `face_analysis`: correct jaw landmarks + meaningful harmony | 🟢 done |
| 5 | MED | `hair_analysis`: real hair-region detection + texture/length | 🟢 done |
| 6 | MED | `body_analysis`: real waist estimate, pose-robust shape | 🟢 done |
| 7 | LOW | Build S3 client once (not per request) | 🟢 done |
| 8 | LOW | Add `greenlet` to requirements (SQLAlchemy async dep) | 🟢 done |
| 9 | — | Fix test harness: FastAPI 0.111→0.115.6, httpx 0.28.1, uvicorn 0.34.0, dedup httpx; conftest env defaults; pin `bcrypt==4.0.1` (passlib incompat) → **8/8 tests pass** | 🟢 done |
| 10 | HIGH | **FE↔BE auth unify**: backend verifies Firebase ID token (`core/firebase_auth.py`), auto-provisions user, JWT fallback kept; `firebase-admin==6.5.0` | 🟢 done |
| 11 | HIGH | **Case + envelope bridge** in `mobile/services/api.ts`: bidi snake↔camel, `{success,data}` wrap, error-detail extraction | 🟢 done |
| 12 | MED | **Route fixes**: `DELETE /analysis/{id}` (was POST/delete), removed nonexistent `reanalyze`; chat `DELETE`, no client `createSession` (session implicit) | 🟢 done |
| 13 | MED | **Type↔contract align**: `HairAnalysis` (thickness/length/color), `BodyProportions` (ratios), `BodyAnalysis.shape` nullable, `Recommendation.confidence`, `ChatMessage.createdAt`; Accessories icons accept `size` → **tsc 0 errors** (was 13) | 🟢 done |

**Verification:** backend **94/94 pytest pass**; mobile `tsc --noEmit` **0 errors**.
_#3:_ `tests/test_ml_pipeline.py` runs the real analyzers (MediaPipe/OpenCV) on a
synthetic image and asserts each output contract + graceful no-detection defaults.
_#7:_ `api/routes/analysis.py` builds the boto3 S3 client once via `_get_s3()` (module singleton).
Firebase setup: set `FIREBASE_CREDENTIALS_FILE` (service-account JSON path) in backend env; without it, backend uses internal JWT only. Free — token verification needs no paid plan.

---

# 1. Deterministic Face-Shape → Style Rules Layer  🟡

## 1.1 Problem

Today the app can tell you **what** your face shape is (`ml/face_analysis.py`
returns `oval`, `round`, `square`, `heart`, `oblong`), but it has **no built-in
knowledge** of what that shape *implies* for styling.

The "if oval face → these necklines / glasses / hairstyles" logic does **not
exist as data anywhere**. It only appears in two weak places:

1. **`ml/hair_analysis.py`** — a hardcoded dict, but keyed on hair **texture**
   (`curly` / `wavy` / `straight`), *not* on face shape:
   ```python
   def _recommend_styles(texture: str) -> list[str]:
       base = ["lob", "curtain_bangs", "soft_waves"]
       if texture == "curly":  return ["wash_and_go", ...] + base
       ...
   ```
2. **`services/ai_service.py`** — the LLM (Gemini/Groq) is handed the analysis
   JSON and asked to invent recommendations on every request. If both API keys
   are missing it falls back to `_fallback_recommendations()`, which is generic
   (a couple of strings switched on undertone/shape).

### Why this is a problem
- **Non-deterministic:** same face → different wording each call.
- **API-dependent:** quality collapses to generic text when offline / no key.
- **Not auditable:** no single place a stylist can review/edit the rules.
- **Wastes the analysis:** we measure face shape precisely, then don't use it
  for the most-expected output ("oval face suits X").

## 1.2 Goal

A **deterministic, offline, editable rules layer** that maps measured features
→ concrete style guidance. Keyed primarily on `face_shape`, with secondary keys
for `undertone` (color) and `body_shape` (silhouette).

The LLM is **not removed** — it becomes a *rephraser/personalizer* on top of
grounded rules instead of the source of truth. Offline, rules alone still give a
full, correct result.

## 1.3 Design

### 1.3.1 Where it lives
New module: **`backend/rules/`**

```
backend/rules/
├── __init__.py
├── face_shape_rules.py     # face_shape → styling guidance
├── color_rules.py          # undertone/season → palette + metals (item 2 later)
├── body_rules.py           # body_shape → silhouette guidance (item 6 later)
└── engine.py               # merges rule outputs into recommendation list
```

Start with `face_shape_rules.py` + `engine.py`. The others are stubs wired in
as later items land.

### 1.3.2 Data shape
Plain Python dict (immutable, version-controlled, zero infra). **Not** a DB
table — these are static domain knowledge, not per-user data, so a dict is
simpler, testable, and diff-able. (DB stays for *storing user results* only.)

```python
# backend/rules/face_shape_rules.py
from dataclasses import dataclass

@dataclass(frozen=True)
class FaceShapeGuide:
    summary: str
    goals: list[str]          # what styling should achieve for this shape
    hairstyles: list[str]
    avoid_hairstyles: list[str]
    necklines: list[str]
    avoid_necklines: list[str]
    glasses: list[str]
    earrings: list[str]
    makeup: list[str]         # contour/blush guidance
    beard: list[str]          # optional, for male users
```

### 1.3.3 Initial knowledge base (the "oval face → this, this")

> Sourced from standard stylist conventions; values are editable strings, not
> magic. Confidence is implicit (curated), so recommendations carry a fixed
> `confidence: 0.9` from rules vs. model-claimed values.

```python
FACE_SHAPE_GUIDES: dict[str, FaceShapeGuide] = {
    "oval": FaceShapeGuide(
        summary="Balanced proportions; the most versatile shape — most styles work.",
        goals=["Maintain natural balance", "Avoid covering the face too much"],
        hairstyles=["Blunt lob", "Side part medium length", "Textured crop",
                    "Curtain bangs", "Long layers"],
        avoid_hairstyles=["Heavy full fringe that shortens the face"],
        necklines=["Crew", "V-neck", "Boat", "Scoop"],          # almost all work
        avoid_necklines=[],
        glasses=["Square", "Rectangular", "Wayfarer", "Geometric"],  # add angles
        earrings=["Studs", "Drops", "Hoops"],
        makeup=["Light, even contour — proportions already balanced",
                "Blush on the apples of the cheeks"],
        beard=["Most styles suit", "Short boxed beard", "Light stubble"],
    ),
    "round": FaceShapeGuide(
        summary="Soft curves, width≈length. Goal: add length & definition.",
        goals=["Lengthen the face", "Add angles/definition", "Add height on top"],
        hairstyles=["Volume on top / quiff", "Long layers past the chin",
                    "Side-swept fringe", "Pompadour"],
        avoid_hairstyles=["Chin-length rounded bob", "Blunt full fringe",
                          "Center curtain styles that widen"],
        necklines=["V-neck", "Sweetheart", "Scoop (deep)"],
        avoid_necklines=["Crew neck", "Boat neck", "Turtleneck"],
        glasses=["Rectangular", "Angular", "Wayfarer"],
        earrings=["Long drops", "Linear dangles", "Angular shapes"],
        makeup=["Contour the sides of cheeks and jaw to slim",
                "Blush angled toward temples", "Highlight chin & forehead center"],
        beard=["Short on sides, longer at chin (elongates)", "Goatee", "Soul patch + goatee"],
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
        beard=["Rounded beard to soften jaw", "Circle beard", "Avoid sharp chin straps"],
    ),
    "heart": FaceShapeGuide(
        summary="Wider forehead, narrow chin. Goal: balance top with bottom width.",
        goals=["Add width at the jaw/chin", "Reduce forehead emphasis"],
        hairstyles=["Chin-length styles", "Side part", "Layers starting at the chin",
                    "Wispy fringe"],
        avoid_hairstyles=["Heavy volume on top", "Slicked-back styles", "Short blunt fringe"],
        necklines=["Boat", "Crew", "Cowl"],            # add visual width low
        avoid_necklines=["Deep V", "Halter"],
        glasses=["Bottom-heavy frames", "Round", "Light/ rimless on top", "Aviator"],
        earrings=["Teardrop (wider at bottom)", "Chandelier"],
        makeup=["Contour temples/forehead sides", "Blush on apples",
                "Highlight & subtly widen the chin"],
        beard=["Fuller beard to add chin width", "Avoid thin/pointed styles"],
    ),
    "oblong": FaceShapeGuide(
        summary="Longer than wide. Goal: add width, shorten the appearance.",
        goals=["Add width at the sides", "Avoid adding height", "Break vertical length"],
        hairstyles=["Side-swept fringe / blunt fringe", "Waves & volume at the sides",
                    "Chin-to-shoulder length with body"],
        avoid_hairstyles=["Long straight flat hair", "Extra height on top"],
        necklines=["Crew", "Boat", "Turtleneck", "Cowl"],   # horizontal lines
        avoid_necklines=["Deep V", "Long pendant zones"],
        glasses=["Tall/deep frames", "Oversized", "Decorative temples (add width)"],
        earrings=["Studs", "Round buttons", "Short wide shapes"],
        makeup=["Horizontal blush across cheeks", "Contour under chin & hairline",
                "Avoid heavy vertical highlight"],
        beard=["Fuller on the cheeks/sides", "Avoid long goatees that lengthen"],
    ),
    "diamond": FaceShapeGuide(
        summary="Narrow forehead & jaw, wide cheekbones. Goal: widen forehead/chin.",
        goals=["Add width at forehead and jaw", "Soften cheekbone dominance"],
        hairstyles=["Fringe to widen forehead", "Chin-length volume", "Side-parts"],
        avoid_hairstyles=["Slicked-back", "Tight high buns that expose cheek width"],
        necklines=["Boat", "Cowl", "Crew"],
        avoid_necklines=["Deep V"],
        glasses=["Oval", "Rimless", "Cat-eye (lifts to forehead)", "Top-heavy frames"],
        earrings=["Studs / hugging styles", "Wider-at-top shapes"],
        makeup=["Highlight forehead & chin", "Soften cheekbone with light contour"],
        beard=["Fuller jaw beard to widen chin", "Light cheek coverage"],
    ),
}

# Safe default for unknown/None shape
DEFAULT_GUIDE = FACE_SHAPE_GUIDES["oval"]

def guide_for(face_shape: str | None) -> FaceShapeGuide:
    return FACE_SHAPE_GUIDES.get((face_shape or "").lower(), DEFAULT_GUIDE)
```

### 1.3.4 Engine — turn guides into recommendation rows

`engine.py` converts the guide(s) into the same `Recommendation` shape the DB &
API already use (`category`, `title`, `description`, `confidence`, `items`), so
**nothing downstream changes**.

```python
# backend/rules/engine.py
from .face_shape_rules import guide_for

RULE_CONFIDENCE = 0.9

def build_rule_recommendations(face: dict, colors: dict, body: dict) -> list[dict]:
    g = guide_for(face.get("shape"))
    recs: list[dict] = []

    recs.append({
        "category": "hair",
        "title": f"Hairstyles for a {face.get('shape', 'balanced')} face",
        "description": g.summary,
        "confidence": RULE_CONFIDENCE,
        "items": g.hairstyles,
    })
    recs.append({
        "category": "outfit",
        "title": "Flattering necklines",
        "description": "Necklines that balance your face shape.",
        "confidence": RULE_CONFIDENCE,
        "items": g.necklines,
    })
    recs.append({
        "category": "accessory",
        "title": "Glasses frames",
        "description": "Frame shapes that complement your proportions.",
        "confidence": RULE_CONFIDENCE,
        "items": g.glasses,
    })
    recs.append({
        "category": "accessory",
        "title": "Earrings",
        "confidence": RULE_CONFIDENCE,
        "description": "Earring shapes that suit your face.",
        "items": g.earrings,
    })
    recs.append({
        "category": "aesthetic",
        "title": "Makeup focus",
        "description": " ".join(g.makeup),
        "confidence": RULE_CONFIDENCE,
        "items": g.makeup,
    })
    return recs
```

### 1.3.5 Integration with the existing flow

In `services/analysis_service.py` → `create_and_analyze()`:

```python
# BEFORE: recs come only from the LLM
recs = await self._ai.generate_recommendations(face, colors, hair)

# AFTER: rules first (always work offline), LLM enriches/personalizes
rule_recs = build_rule_recommendations(face, colors, body)
try:
    llm_recs = await self._ai.generate_recommendations(face, colors, hair)
except Exception:
    llm_recs = []
recs = _merge(rule_recs, llm_recs)   # rules are the floor; LLM adds/refines
```

`_merge` strategy (keep it simple to start): start from `rule_recs`; append LLM
recs whose `(category, title)` isn't already covered. Rules guarantee a complete
baseline; the LLM only *adds* personality and extra ideas. Optionally pass the
rule output **into** the LLM prompt so it rephrases rather than invents — higher
quality, still grounded.

### 1.3.6 Why dict, not a DB table
| | Python dict | DB table |
|---|---|---|
| Setup | none | migration + seed |
| Edit/review | git diff | admin UI / SQL |
| Per-request cost | zero | query + cache |
| Versioned with code | yes | no |
| Per-user data | n/a (static) | n/a (static) |

Static domain knowledge → dict wins. Revisit only if non-engineers need to edit
rules at runtime (then promote to a seeded table with the same shape).

## 1.4 Files to add / change
- **add** `backend/rules/__init__.py`
- **add** `backend/rules/face_shape_rules.py`  (the guides above)
- **add** `backend/rules/engine.py`            (`build_rule_recommendations`)
- **edit** `backend/services/analysis_service.py` (rules-first merge)
- **add** `backend/tests/test_rules.py`         (see below)

## 1.5 Testing
Pure functions, no DB/network — fast and deterministic.

```python
def test_every_shape_has_full_guide():
    for shape, g in FACE_SHAPE_GUIDES.items():
        assert g.hairstyles and g.necklines and g.glasses

def test_oval_returns_versatile_summary():
    g = guide_for("oval")
    assert "versatile" in g.summary.lower()

def test_unknown_shape_falls_back_to_default():
    assert guide_for("potato") is DEFAULT_GUIDE
    assert guide_for(None) is DEFAULT_GUIDE

def test_engine_emits_db_shaped_rows():
    recs = build_rule_recommendations({"shape": "round"}, {}, {})
    assert recs and all({"category","title","confidence","items"} <= r.keys() for r in recs)
    assert any(r["category"] == "hair" for r in recs)
```

## 1.6 Acceptance criteria
- [ ] With **no AI keys set**, an analysis still returns shape-specific hair,
      neckline, glasses, earring, and makeup recommendations.
- [ ] `oval` face yields the versatile/"most styles work" guidance.
- [ ] Unknown/None shape degrades to the oval default without error.
- [ ] Existing API response schema unchanged (recs still render in the app).
- [ ] `test_rules.py` passes; rules covered ≥90%.

## 1.7 Effort & risk
- **Effort:** ~half a day (mostly curating the knowledge base).
- **Risk:** low — additive, no schema change, no breaking of current LLM path.
- **Follow-on:** items 2 (color rules) and 6 (body rules) plug into the same
  `engine.py` once their analyzers are fixed.

---

_Items 2–8: to be expanded one at a time, same format as above._
