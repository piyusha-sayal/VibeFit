"""Create My Look.

Composition happens here; recommendation does not. Every endpoint calls the
engines that already exist — there is no second styling system and no second
saved-looks store: a saved look is a `SavedLook` of kind `complete`, which the
Beauty Passport already reads.

Ownership is enforced on every row: drafts, saved looks and feedback are all
filtered by the authenticated user, and a composition posted by a client is
re-resolved against the catalogue rather than trusted.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from core.database import get_db
from models.beauty import SavedLook
from models.user import User
from rules import look_composer, style_aesthetics
from rules.look_structures import OCCASION_KEYS, OCCASIONS, STRUCTURES, STRUCTURE_BY_KEY
from services import look_service
from services.passport_service import record_activity

router = APIRouter(prefix="/looks", tags=["looks"])

# A composition is user-supplied JSON. It is bounded so a client cannot store
# an arbitrarily large blob against its own account.
MAX_PIECES = 12
LOOK_STATUSES = {"saved", "want_to_try", "tried"}


# ------------------------------------------------------------------ schemas

class Brief(BaseModel):
    """What the user asked for. Every field optional — Level 1 is no answers."""

    occasion: str | None = None
    custom_occasion: str | None = Field(default=None, alias="customOccasion", max_length=60)
    aesthetics: list[str] = Field(default_factory=list)
    regions: list[str] = Field(default_factory=list)
    exclude: list[str] = Field(default_factory=list)
    limit: int = Field(default=3, ge=1, le=6)

    model_config = {"populate_by_name": True}

    @field_validator("occasion")
    @classmethod
    def _known_occasion(cls, value: str | None) -> str | None:
        if value is not None and value not in OCCASION_KEYS:
            raise ValueError(f"Unknown occasion. One of: {', '.join(OCCASION_KEYS)}")
        return value

    @field_validator("aesthetics")
    @classmethod
    def _known_aesthetics(cls, value: list[str]) -> list[str]:
        unknown = [k for k in value if k not in style_aesthetics.AESTHETIC_BY_KEY]
        if unknown:
            raise ValueError(f"Unknown aesthetic: {', '.join(unknown)}")
        return value


class CompositionIn(BaseModel):
    composition: dict

    @field_validator("composition")
    @classmethod
    def _looks_like_a_composition(cls, value: dict) -> dict:
        outfit = value.get("outfit")
        if not isinstance(outfit, dict) or not isinstance(outfit.get("pieces"), list):
            raise ValueError("Not a look composition")
        if len(outfit["pieces"]) > MAX_PIECES:
            raise ValueError("Too many pieces in this look")
        if value.get("structure") not in STRUCTURE_BY_KEY:
            raise ValueError("Unknown outfit structure")
        return value


class ApplyIn(CompositionIn):
    component: str
    selection: dict = Field(default_factory=dict)

    @field_validator("component")
    @classmethod
    def _known_component(cls, value: str) -> str:
        if value not in look_composer.COMPONENTS:
            raise ValueError(f"Unknown component. One of: {', '.join(look_composer.COMPONENTS)}")
        return value


class ShiftIn(CompositionIn):
    kind: str

    @field_validator("kind")
    @classmethod
    def _known_shift(cls, value: str) -> str:
        if value not in {s["key"] for s in look_composer.SHIFTS}:
            raise ValueError("Unknown variation")
        return value


class DraftIn(CompositionIn):
    draft_id: str | None = Field(default=None, alias="draftId")
    name: str | None = Field(default=None, max_length=120)
    brief: dict | None = None

    model_config = {"populate_by_name": True}


class SaveIn(CompositionIn):
    name: str | None = Field(default=None, max_length=120)
    status: str = "saved"
    notes: str | None = Field(default=None, max_length=2000)
    client_token: str | None = Field(default=None, alias="clientToken", max_length=64)
    draft_id: str | None = Field(default=None, alias="draftId")

    model_config = {"populate_by_name": True}

    @field_validator("status")
    @classmethod
    def _known_status(cls, value: str) -> str:
        if value not in LOOK_STATUSES:
            raise ValueError("Unknown look status")
        return value


class LookPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    status: str | None = None
    notes: str | None = Field(default=None, max_length=2000)
    composition: dict | None = None


class DuplicateIn(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    client_token: str | None = Field(default=None, alias="clientToken", max_length=64)

    model_config = {"populate_by_name": True}


class FeedbackIn(BaseModel):
    component: str
    item_key: str = Field(alias="itemKey", max_length=60)
    verdict: str

    model_config = {"populate_by_name": True}

    @field_validator("component")
    @classmethod
    def _known_component(cls, value: str) -> str:
        if value not in look_service.FEEDBACK_COMPONENTS:
            raise ValueError("Unknown component")
        return value

    @field_validator("verdict")
    @classmethod
    def _known_verdict(cls, value: str) -> str:
        if value not in look_service.VERDICTS:
            raise ValueError(f"Unknown verdict. One of: {', '.join(look_service.VERDICTS)}")
        return value


# ------------------------------------------------------------------ helpers

def _look_out(look: SavedLook) -> dict:
    return {
        "id": look.id, "name": look.name, "kind": look.kind, "status": look.status,
        "occasion": look.occasion, "payload": look.payload, "notes": look.notes,
        "createdAt": look.created_at, "updatedAt": look.updated_at,
    }


async def _own_look(db: AsyncSession, user_id: str, look_id: str) -> SavedLook:
    look = (await db.execute(
        select(SavedLook).where(SavedLook.id == look_id, SavedLook.user_id == user_id)
    )).scalars().first()
    if look is None:
        raise HTTPException(status_code=404, detail="Look not found")
    return look


# ------------------------------------------------------------------ reference

@router.get("/options")
async def look_options():
    """Everything the flow needs, so the client hardcodes no styling knowledge."""
    return {
        "occasions": list(OCCASIONS),
        "structures": [
            {"key": s.key, "name": s.name, "region": s.region, "summary": s.summary,
             "formality": s.formality, "occasions": list(s.occasions),
             "slots": [{"slot": slot.slot, "label": slot.label, "role": slot.role,
                        "required": slot.required, "note": slot.note}
                       for slot in s.slots]}
            for s in STRUCTURES
        ],
        "components": list(look_composer.COMPONENTS),
        "shifts": list(look_composer.SHIFTS),
        "verdicts": list(look_service.VERDICTS),
        "aesthetics": [style_aesthetics.serialise(a) for a in style_aesthetics.AESTHETICS],
        "excludable": [{"key": k, "label": v[0]} for k, v in look_service.GAPS.items()],
        "visualisationNote": look_composer.VISUALISATION_NOTE,
    }


@router.get("/context")
async def look_context(
    exclude: str | None = Query(default=None,
                                description="Comma-separated profile attributes to leave out"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """What this look would be personalised from, and what is missing."""
    excluded = [e.strip() for e in (exclude or "").split(",") if e.strip()]
    context = await look_service.build_look_context(db, current_user.id, exclude=excluded)
    return look_service.context_summary(context)


# ------------------------------------------------------------------ generate

@router.post("/generate")
async def generate_looks(
    brief: Brief,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Coordinated look concepts. Works with a completely empty profile."""
    context = await look_service.build_look_context(
        db, current_user.id, exclude=brief.exclude)
    rejected = await look_service.rejected_keys(db, current_user.id)

    looks = look_composer.generate(
        context,
        occasion=brief.occasion,
        aesthetics=brief.aesthetics,
        regions=brief.regions,
        rejected=rejected,
        limit=brief.limit,
    )
    if brief.custom_occasion:
        looks = [{**look, "occasionLabel": brief.custom_occasion} for look in looks]

    return {
        "looks": looks,
        "count": len(looks),
        "context": look_service.context_summary(context),
        "brief": brief.model_dump(by_alias=True),
    }


@router.get("/alternatives")
async def component_alternatives(
    component: str,
    structure: str,
    slot: str | None = None,
    occasion: str | None = None,
    aesthetic: str | None = None,
    exclude: str | None = None,
    limit: int = Query(default=12, ge=1, le=40),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replacements for one component. Nothing else in the look is touched."""
    if component not in look_composer.COMPONENTS:
        raise HTTPException(status_code=404, detail="Unknown component")
    if structure not in STRUCTURE_BY_KEY:
        raise HTTPException(status_code=404, detail="Unknown outfit structure")

    excluded = [e.strip() for e in (exclude or "").split(",") if e.strip()]
    context = await look_service.build_look_context(db, current_user.id, exclude=excluded)
    stub = {"structure": structure, "occasion": occasion, "aesthetic": aesthetic}
    options = look_composer.alternatives(component, stub, context, slot=slot, limit=limit)

    feedback = {f["itemKey"]: f["verdict"] for f in await look_service.list_feedback(db, current_user.id)}
    return {
        "component": component,
        "slot": slot,
        "count": len(options),
        "options": [{**o, "verdict": feedback.get(o["key"])} for o in options],
    }


@router.post("/apply")
async def apply_component(
    payload: ApplyIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Swap one component and return the whole look, recomposed.

    The rules live here rather than in the client, so a colour change updates
    the harmony note the same way on every platform.
    """
    updated = look_composer.apply_selection(
        payload.composition, payload.component, payload.selection)
    changed = updated != payload.composition
    return {"composition": updated, "changed": changed,
            "note": None if changed else "That selection is not available for this look."}


@router.post("/shift")
async def shift_look(
    payload: ShiftIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A targeted variation. Anything the variation does not name is preserved."""
    context = await look_service.build_look_context(db, current_user.id)
    updated = look_composer.shift(payload.composition, context, payload.kind)
    changed = updated != payload.composition
    return {
        "composition": updated,
        "changed": changed,
        "note": None if changed else
        "Nothing in the library sits further in that direction for this occasion.",
    }


# -------------------------------------------------------------------- drafts

@router.get("/drafts")
async def list_drafts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return {"drafts": await look_service.list_drafts(db, current_user.id)}


@router.post("/drafts")
async def save_draft(
    payload: DraftIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Autosave. Passing the draft id back updates in place rather than piling up."""
    draft = await look_service.upsert_draft(
        db, current_user.id,
        draft_id=payload.draft_id,
        composition=payload.composition,
        brief=payload.brief,
        name=payload.name,
    )
    await db.commit()
    await db.refresh(draft)
    return look_service.draft_out(draft)


@router.get("/drafts/{draft_id}")
async def get_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    draft = await look_service.get_draft(db, current_user.id, draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    return look_service.draft_out(draft)


@router.delete("/drafts/{draft_id}", status_code=204)
async def discard_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await look_service.delete_draft(db, current_user.id, draft_id):
        raise HTTPException(status_code=404, detail="Draft not found")
    await db.commit()


# --------------------------------------------------------------- saved looks

@router.get("/saved")
async def list_saved(
    status: str | None = None,
    limit: int = Query(default=30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(SavedLook).where(SavedLook.user_id == current_user.id,
                                    SavedLook.kind == "complete")
    if status:
        if status not in LOOK_STATUSES:
            raise HTTPException(status_code=422, detail="Unknown look status")
        query = query.where(SavedLook.status == status)
    looks = (await db.execute(
        query.order_by(desc(SavedLook.updated_at)).limit(limit)
    )).scalars().all()
    return {"looks": [_look_out(look) for look in looks], "count": len(looks)}


@router.post("/save", status_code=201)
async def save_look(
    payload: SaveIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a complete look, then discard the draft it came from.

    Idempotent on `clientToken`: replaying the request returns the look already
    saved rather than creating a second one.
    """
    look, created = await look_service.save_composition(
        db, current_user.id,
        composition=payload.composition,
        name=payload.name,
        status=payload.status,
        notes=payload.notes,
        client_token=payload.client_token,
    )
    if created and payload.draft_id:
        await look_service.delete_draft(db, current_user.id, payload.draft_id)
    await db.commit()
    await db.refresh(look)
    return {**_look_out(look), "created": created}


@router.get("/compare")
async def compare_looks(
    ids: str = Query(description="Two or three saved look ids, comma separated"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Read-only. Comparing never alters any of the looks being compared."""
    wanted = [i.strip() for i in ids.split(",") if i.strip()][:3]
    if len(wanted) < 2:
        raise HTTPException(status_code=422, detail="Compare needs at least two looks")

    looks = (await db.execute(
        select(SavedLook).where(SavedLook.user_id == current_user.id,
                                SavedLook.id.in_(wanted))
    )).scalars().all()
    if len(looks) != len(wanted):
        raise HTTPException(status_code=404, detail="One of those looks is not yours")

    ordered = sorted(looks, key=lambda look: wanted.index(look.id))
    return look_service.compare(ordered)


# ------------------------------------------------------------------ feedback

@router.get("/feedback")
async def get_feedback(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return {"feedback": await look_service.list_feedback(db, current_user.id)}


@router.post("/feedback", status_code=201)
async def send_feedback(
    payload: FeedbackIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """One verdict on one item. Repeating it updates rather than duplicates."""
    row = await look_service.record_feedback(
        db, current_user.id, payload.component, payload.item_key, payload.verdict)
    await db.commit()
    return {"component": row.component, "itemKey": row.item_key, "verdict": row.verdict}


@router.get("/{look_id}")
async def get_look(
    look_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reopen a saved look, reporting anything the catalogue has since lost."""
    look = await _own_look(db, current_user.id, look_id)
    return {**_look_out(look), **look_service.reconstruct(look.payload)}


@router.patch("/{look_id}")
async def update_look(
    look_id: str,
    payload: LookPatch,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Edit a saved look in place. Duplicating is a separate, explicit action."""
    look = await _own_look(db, current_user.id, look_id)
    data = payload.model_dump(exclude_unset=True)

    if "status" in data and data["status"] not in LOOK_STATUSES:
        raise HTTPException(status_code=422, detail="Unknown look status")
    if "composition" in data and data["composition"] is not None:
        composition = data.pop("composition")
        outfit = composition.get("outfit")
        if not isinstance(outfit, dict) or not isinstance(outfit.get("pieces"), list):
            raise HTTPException(status_code=422, detail="Not a look composition")
        look.payload = composition
        look.occasion = composition.get("occasion")

    became_tried = data.get("status") == "tried" and look.status != "tried"
    for key, value in data.items():
        if value is not None:
            setattr(look, key, value)
    await db.flush()

    if became_tried:
        await record_activity(db, current_user.id, "look_tried",
                              f"Tried “{look.name}”", look.id)
    await db.commit()
    await db.refresh(look)
    return _look_out(look)


@router.post("/{look_id}/duplicate", status_code=201)
async def duplicate_look(
    look_id: str,
    payload: DuplicateIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Copy a look so a variant can be explored without losing the original."""
    copy, created = await look_service.duplicate_look(
        db, current_user.id, look_id, name=payload.name, client_token=payload.client_token)
    if copy is None:
        raise HTTPException(status_code=404, detail="Look not found")
    await db.commit()
    await db.refresh(copy)
    return {**_look_out(copy), "created": created}
