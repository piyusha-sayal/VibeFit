"""Create My Look: personalisation context, drafts, saving and feedback.

The one place that decides *what MyLookFit knows about a user* when it builds a
look. Both existing sources are read and merged — `face_service.studio_context`
for face, hair and colour, `style_service.recommendation_inputs` for body,
fit and wardrobe — so Create My Look can never disagree with the studios it
draws from.

Nothing here invents a value. An attribute the user has not supplied appears in
`missing` with the screen that fills it, and the engines treat it as absent.
"""
from __future__ import annotations

from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.beauty import LookDraft, LookFeedback, SavedLook
from rules import look_composer
from rules.color_season import build_color_report
from rules.fashion_library import GARMENT_BY_KEY
from rules.hair_library import HAIRSTYLE_BY_KEY
from rules.look_structures import STRUCTURE_BY_KEY
from rules.makeup_library import AESTHETIC_BY_KEY as MAKEUP_BY_KEY
from services.face_service import latest_analysis, studio_context
from services.passport_service import record_activity
from services.style_service import recommendation_inputs

# Profile attributes a user may exclude from one particular look. The key is
# what the client sends; the value is what it switches off in the context.
EXCLUDABLE = {
    "personal_colour": ("season", "seasonLabel", "seasonFamily", "undertone", "palettes"),
    "face_shape": ("faceShape",),
    "hair": ("hairTexture", "hairLength", "maintenanceTolerance"),
    "features": ("attributes", "contrast"),
    "body_type": ("bodyType", "effectiveBodyType"),
    "aesthetics": ("aesthetics",),
    "fit": ("fitPreference", "silhouettes"),
}

# What a missing attribute is called, and where it is filled.
GAPS = {
    "personal_colour": ("Colour analysis", "/colors"),
    "face_shape": ("Face shape", "/face/shape"),
    "hair": ("Hair texture", "/hair"),
    "features": ("Facial features", "/face/features"),
    "body_type": ("Body styling", "/style/questionnaire"),
    "aesthetics": ("Fashion aesthetics", "/style/aesthetics"),
    "fit": ("Fit and silhouette", "/style/questionnaire"),
}

VERDICTS = ("love", "not_my_style", "want_to_try", "tried")
FEEDBACK_COMPONENTS = ("outfit", "colours", "hair", "hairColour", "makeup",
                       "lipstick", "jewellery", "accessories", "footwear")


# ------------------------------------------------------------------ context

def _present(context: dict, key: str) -> bool:
    fields = EXCLUDABLE[key]
    return any(context.get(field) for field in fields)


async def build_look_context(
    db: AsyncSession,
    user_id: str,
    *,
    exclude: list[str] | None = None,
) -> dict:
    """Everything the composer may personalise from, and everything it may not.

    `exclude` drops attributes for this look only. Nothing is deleted: the
    stored profile is untouched and the next look sees it again.
    """
    excluded = {e for e in (exclude or []) if e in EXCLUDABLE}

    face = await studio_context(db, user_id)
    style = await recommendation_inputs(db, user_id)
    analysis = await latest_analysis(db, user_id)
    colours = (analysis.color_analysis if analysis else None) or {}
    report = build_color_report(colours)

    context: dict = {
        "season": face["season"],
        "seasonLabel": face["seasonLabel"],
        "seasonFamily": face["seasonFamily"],
        "undertone": face["undertone"],
        "palettes": (report or {}).get("palettes") or {},
        "faceShape": face["faceShape"],
        "attributes": face["attributes"],
        "contrast": face["contrast"],
        "hairTexture": face["hairTexture"],
        "hairLength": None,
        "maintenanceTolerance": face["maintenanceTolerance"],
        "genderPresentation": face["genderPresentation"],
        "bodyType": style["bodyType"],
        "effectiveBodyType": style["effectiveBodyType"],
        "aesthetics": style["aesthetics"],
        "silhouettes": style["silhouettes"],
        "fitPreference": style["fitPreference"],
        "cultural": style["cultural"],
        "climate": style["climate"],
        "budget": style["budget"],
    }

    # Recorded before exclusions, so the builder can offer to switch an
    # attribute back on for this look.
    available = [key for key in EXCLUDABLE if _present(context, key)]
    for key in excluded:
        for field in EXCLUDABLE[key]:
            context[field] = {} if field in ("palettes", "attributes") else None
    # Lists must stay lists, or the engines iterate over None.
    for field in ("aesthetics", "silhouettes", "cultural"):
        context[field] = context.get(field) or []

    used = [key for key in EXCLUDABLE if _present(context, key)]
    missing = [
        {"key": key, "label": GAPS[key][0], "route": GAPS[key][1]}
        for key in EXCLUDABLE if not _present(context, key)
    ]

    context["used"] = [GAPS[key][0] for key in used]
    context["missing"] = [gap["label"] for gap in missing]
    context["availableAttributes"] = available
    context["excluded"] = sorted(excluded)
    context["gaps"] = missing
    return context


def context_summary(context: dict) -> dict:
    """What the builder shows the user about their own personalisation."""
    return {
        "level": look_composer.personalisation_level(context),
        "using": [
            {"key": key, "label": GAPS[key][0],
             "value": _display_value(context, key)}
            for key in EXCLUDABLE if _present(context, key)
        ],
        "excluded": context.get("excluded", []),
        "missing": context.get("gaps", []),
        "excludable": [
            {"key": key, "label": GAPS[key][0]}
            for key in EXCLUDABLE if key in context.get("availableAttributes", [])
        ],
    }


def _display_value(context: dict, key: str) -> str | None:
    if key == "personal_colour":
        return context.get("seasonLabel")
    if key == "face_shape":
        return context.get("faceShape")
    if key == "hair":
        return context.get("hairTexture")
    if key == "features":
        attributes = context.get("attributes") or {}
        return f"{len(attributes)} confirmed" if attributes else None
    if key == "body_type":
        value = context.get("bodyType")
        return value.replace("_", " ") if value else None
    if key == "aesthetics":
        return ", ".join(context.get("aesthetics") or []) or None
    if key == "fit":
        return context.get("fitPreference")
    return None


# ----------------------------------------------------------------- feedback

async def rejected_keys(db: AsyncSession, user_id: str) -> set[str]:
    """Items the user said are not their style. Demoted, never removed."""
    rows = (await db.execute(
        select(LookFeedback.item_key)
        .where(LookFeedback.user_id == user_id, LookFeedback.verdict == "not_my_style")
    )).scalars().all()
    return set(rows)


async def record_feedback(db: AsyncSession, user_id: str, component: str,
                          item_key: str, verdict: str) -> LookFeedback:
    """Upsert one verdict. Repeated feedback updates rather than accumulates."""
    row = (await db.execute(
        select(LookFeedback).where(
            LookFeedback.user_id == user_id,
            LookFeedback.component == component,
            LookFeedback.item_key == item_key,
        )
    )).scalars().first()
    if row is None:
        row = LookFeedback(user_id=user_id, component=component,
                           item_key=item_key, verdict=verdict)
        db.add(row)
    else:
        row.verdict = verdict
    await db.flush()
    return row


async def list_feedback(db: AsyncSession, user_id: str) -> list[dict]:
    rows = (await db.execute(
        select(LookFeedback)
        .where(LookFeedback.user_id == user_id)
        .order_by(desc(LookFeedback.updated_at))
    )).scalars().all()
    return [
        {"component": r.component, "itemKey": r.item_key, "verdict": r.verdict,
         "updatedAt": r.updated_at}
        for r in rows
    ]


# ------------------------------------------------------------------- drafts

def draft_out(draft: LookDraft) -> dict:
    return {
        "id": draft.id,
        "name": draft.name,
        "occasion": draft.occasion,
        "composition": draft.composition,
        "brief": draft.brief,
        "createdAt": draft.created_at,
        "updatedAt": draft.updated_at,
    }


async def list_drafts(db: AsyncSession, user_id: str, limit: int = 10) -> list[dict]:
    rows = (await db.execute(
        select(LookDraft)
        .where(LookDraft.user_id == user_id)
        .order_by(desc(LookDraft.updated_at))
        .limit(limit)
    )).scalars().all()
    return [draft_out(d) for d in rows]


async def get_draft(db: AsyncSession, user_id: str, draft_id: str) -> LookDraft | None:
    return (await db.execute(
        select(LookDraft).where(LookDraft.id == draft_id, LookDraft.user_id == user_id)
    )).scalars().first()


async def upsert_draft(db: AsyncSession, user_id: str, *, draft_id: str | None,
                       composition: dict, brief: dict | None, name: str | None) -> LookDraft:
    """Create or update. A draft id the caller already holds is reused, so a
    builder that autosaves does not leave a trail of half-finished looks."""
    draft = await get_draft(db, user_id, draft_id) if draft_id else None
    first = draft is None
    if draft is None:
        draft = LookDraft(user_id=user_id)
        db.add(draft)

    draft.composition = composition
    draft.brief = brief
    draft.name = name or composition.get("name")
    draft.occasion = composition.get("occasion")
    await db.flush()

    if first:
        # One event for starting a look, not one per keystroke.
        await record_activity(db, user_id, "look_created",
                              f"Started “{draft.name}”", draft.id)
    return draft


async def delete_draft(db: AsyncSession, user_id: str, draft_id: str) -> bool:
    result = await db.execute(
        delete(LookDraft).where(LookDraft.id == draft_id, LookDraft.user_id == user_id)
    )
    return result.rowcount > 0


# -------------------------------------------------------------- saved looks

def _look_out(look: SavedLook) -> dict:
    return {
        "id": look.id, "name": look.name, "kind": look.kind, "status": look.status,
        "occasion": look.occasion, "payload": look.payload, "notes": look.notes,
        "createdAt": look.created_at, "updatedAt": look.updated_at,
    }


async def find_by_token(db: AsyncSession, user_id: str, token: str | None) -> SavedLook | None:
    if not token:
        return None
    return (await db.execute(
        select(SavedLook).where(SavedLook.user_id == user_id,
                                SavedLook.client_token == token)
    )).scalars().first()


async def save_composition(
    db: AsyncSession,
    user_id: str,
    *,
    composition: dict,
    name: str | None = None,
    status: str = "saved",
    notes: str | None = None,
    client_token: str | None = None,
) -> tuple[SavedLook, bool]:
    """Persist a complete look. Returns (look, created).

    A replayed request carrying the same `client_token` returns the original
    row untouched, so a slow network cannot produce two identical saved looks.
    """
    existing = await find_by_token(db, user_id, client_token)
    if existing is not None:
        return existing, False

    look = SavedLook(
        user_id=user_id,
        name=(name or composition.get("name") or "Untitled look")[:120],
        kind="complete",
        status=status,
        occasion=composition.get("occasion"),
        payload=composition,
        notes=notes,
        client_token=client_token,
    )
    db.add(look)
    await db.flush()
    await record_activity(db, user_id, "look_saved", f"Saved “{look.name}”", look.id)
    return look, True


async def duplicate_look(db: AsyncSession, user_id: str, look_id: str, *,
                         name: str | None = None,
                         client_token: str | None = None) -> tuple[SavedLook | None, bool]:
    """Copy a saved look. The original is never modified."""
    existing = await find_by_token(db, user_id, client_token)
    if existing is not None:
        return existing, False

    source = (await db.execute(
        select(SavedLook).where(SavedLook.id == look_id, SavedLook.user_id == user_id)
    )).scalars().first()
    if source is None:
        return None, False

    copy = SavedLook(
        user_id=user_id,
        name=(name or f"{source.name} (copy)")[:120],
        kind=source.kind,
        status="saved",
        occasion=source.occasion,
        payload=source.payload,
        notes=source.notes,
        client_token=client_token,
    )
    db.add(copy)
    await db.flush()
    await record_activity(db, user_id, "look_saved", f"Duplicated “{source.name}”", copy.id)
    return copy, True


# ------------------------------------------------------------ reconstruction

def _check(component: str, key: str | None, lookup) -> dict | None:
    if not key:
        return None
    if key in lookup:
        return None
    return {"component": component, "key": key}


def reconstruct(payload: dict | None) -> dict:
    """Reopen a saved composition, reporting anything the catalogue lost.

    A garment or cut that has since been removed is reported as unavailable and
    the user's stored selection is preserved verbatim. It is never silently
    swapped for something else — that would rewrite a decision the user made.
    """
    outfit = payload.get("outfit") if isinstance(payload, dict) else None
    if not isinstance(outfit, dict) or not isinstance(outfit.get("pieces"), list):
        return {"composition": payload, "reconstructable": False, "unavailable": [],
                "note": "This look was saved before the Look Builder existed. "
                        "It opens read-only."}

    unavailable: list[dict] = []
    pieces = []
    for piece in outfit["pieces"]:
        known = piece.get("key") in GARMENT_BY_KEY
        if not known:
            unavailable.append({"component": "outfit", "key": piece.get("key"),
                                "name": piece.get("name")})
        pieces.append({**piece, "available": known})

    for component, key, lookup in (
        ("hair", (payload.get("hair") or {}).get("style"), HAIRSTYLE_BY_KEY),
        ("makeup", (payload.get("makeup") or {}).get("aesthetic"), MAKEUP_BY_KEY),
    ):
        gone = _check(component, key, lookup)
        if gone:
            unavailable.append(gone)

    structure_known = payload.get("structure") in STRUCTURE_BY_KEY
    composition = {
        **payload,
        "outfit": {**(payload.get("outfit") or {}), "pieces": pieces},
    }
    return {
        "composition": composition,
        "reconstructable": True,
        "editable": structure_known,
        "unavailable": unavailable,
        "note": None if not unavailable else
        "Some pieces are no longer in our library. Your saved choices are kept "
        "as they were; pick a replacement when you want one.",
    }


def compare(looks: list[SavedLook]) -> dict:
    """Side-by-side rows for two or three looks. Reads only; changes nothing."""
    rows = [
        {"key": "occasion", "label": "Occasion"},
        {"key": "outfit", "label": "Outfit"},
        {"key": "colours", "label": "Colours"},
        {"key": "hair", "label": "Hair"},
        {"key": "makeup", "label": "Makeup"},
        {"key": "jewellery", "label": "Jewellery"},
        {"key": "status", "label": "Saved as"},
    ]
    entries = []
    for look in looks:
        payload = look.payload if isinstance(look.payload, dict) else {}
        outfit = payload.get("outfit")
        pieces = outfit.get("pieces") if isinstance(outfit, dict) else []
        pieces = [p for p in pieces if isinstance(p, dict)] if isinstance(pieces, list) else []
        colours = [p["colour"]["name"] for p in pieces
                   if isinstance(p.get("colour"), dict) and p["colour"].get("name")]
        entries.append({
            "id": look.id,
            "name": look.name,
            "status": look.status,
            "values": {
                "occasion": (look.occasion or "—").replace("_", " "),
                "outfit": ", ".join(p["name"] for p in pieces[:3]) or "—",
                "colours": ", ".join(colours[:3]) or "Not set",
                "hair": (payload.get("hair") or {}).get("styleName") or "—",
                "makeup": (payload.get("makeup") or {}).get("aestheticName") or "—",
                "jewellery": (payload.get("jewellery") or {}).get("metalName") or "—",
                "status": look.status.replace("_", " "),
            },
            "swatches": [p["colour"] for p in pieces if isinstance(p.get("colour"), dict)][:4],
        })
    return {"rows": rows, "looks": entries}
