from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from core.database import get_db
from core.security import verify_password, hash_password
from models.user import User
from schemas.auth import UserResponse
from api.deps import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


class UpdateProfileRequest(BaseModel):
    name: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.name is not None:
        current_user.name = body.name.strip() or current_user.name
    await db.flush()
    return current_user


@router.post("/me/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=422, detail="New password must be at least 8 characters")
    current_user.hashed_password = hash_password(body.new_password)
    await db.flush()


@router.delete("/me", status_code=204)
async def delete_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.delete(current_user)
