"""Privacy endpoints: photographs, consent, export, account deletion.

Every route here is scoped to `current_user.id`. No route takes a user id from
the client, so there is no id to tamper with. The only identifier a caller can
supply is an analysis id, and that one is checked for ownership before
anything is touched.
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import REAUTH_MAX_AGE_SECONDS, firebase_auth_age, get_current_user
from core.database import get_db
from core.security import verify_password
from models.user import User
from services import privacy_service

router = APIRouter(prefix="/privacy", tags=["privacy"])


class ConsentIn(BaseModel):
    photo_retention_consent: bool | None = None
    photo_reuse_consent: bool | None = None


class DeleteAccountIn(BaseModel):
    """Two independent barriers, because this is not undoable.

    The phrase has to be typed, which a stray tap cannot produce, and the
    password has to be re-entered, which proves the person at the keyboard is
    the account holder rather than whoever picked up an unlocked phone.
    """
    confirmation: str = Field(min_length=1, max_length=64)
    password: str | None = Field(default=None, max_length=256)


@router.get("/photos")
async def list_photos(db: AsyncSession = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    # There is no scheduler on this plan, so the retry queue is drained from
    # the screen most likely to be open when someone cares about it.
    await privacy_service.sweep_pending_deletions(db)
    return await privacy_service.list_photos(db, current_user.id)


@router.delete("/photos/{analysis_id}")
async def delete_photo(analysis_id: str,
                       db: AsyncSession = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    result = await privacy_service.delete_photo(db, current_user.id, analysis_id)
    if result is None:
        # Same answer whether it belongs to someone else or does not exist:
        # a different status would confirm another user's analysis id.
        raise HTTPException(status_code=404, detail="Analysis not found")
    return result


@router.delete("/photos")
async def delete_all_photos(db: AsyncSession = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    result = await privacy_service.delete_all_photos(db, current_user.id)
    await privacy_service.sweep_pending_deletions(db)
    return result


@router.get("/consent")
async def get_consent(db: AsyncSession = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    return await privacy_service.get_consent(db, current_user.id)


@router.patch("/consent")
async def set_consent(body: ConsentIn,
                      db: AsyncSession = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    return await privacy_service.set_consent(
        db, current_user.id,
        retention=body.photo_retention_consent,
        reuse=body.photo_reuse_consent)


@router.get("/export")
async def export_data(db: AsyncSession = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    """The account as one downloadable JSON document.

    Sent as an attachment so the app can hand it straight to the share sheet
    without re-encoding it, and so a browser saves it rather than rendering it.
    """
    payload = await privacy_service.export_user_data(db, current_user.id)
    body = json.dumps(payload, indent=2, ensure_ascii=False, default=str)
    stamp = payload.get("exportedAt", "")[:10]
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition":
                 f'attachment; filename="mylookfit-export-{stamp}.json"'},
    )


@router.post("/delete-account")
async def delete_account(body: DeleteAccountIn,
                         db: AsyncSession = Depends(get_db),
                         current_user: User = Depends(get_current_user),
                         auth_age: float | None = Depends(firebase_auth_age)):
    if body.confirmation.strip() != privacy_service.DELETE_CONFIRMATION:
        raise HTTPException(
            status_code=400,
            detail=f'Type "{privacy_service.DELETE_CONFIRMATION}" to confirm')

    if current_user.hashed_password:
        # A password account reauthenticates by re-entering it.
        if not body.password:
            raise HTTPException(status_code=400,
                                detail="Enter your password to confirm")
        if not verify_password(body.password, current_user.hashed_password):
            raise HTTPException(status_code=401, detail="Password is incorrect")
    elif auth_age is not None:
        # A Firebase account has no local password to check, so recency of the
        # sign-in itself is the evidence. Firebase rotates ID tokens hourly
        # without the user doing anything, so "the token is valid" says nothing
        # about who is holding the phone — `auth_time` does.
        if auth_age > REAUTH_MAX_AGE_SECONDS:
            raise HTTPException(
                status_code=401,
                detail="Please sign in again before deleting your account.")
    else:
        # Neither a local password nor a Firebase session. Nothing here proves
        # a present account holder, so this irreversible action is refused
        # rather than performed on the strength of a bearer token alone.
        raise HTTPException(
            status_code=401,
            detail="Please sign in again before deleting your account.")

    result = await privacy_service.delete_account(db, current_user.id)
    await privacy_service.sweep_pending_deletions(db)
    return result
