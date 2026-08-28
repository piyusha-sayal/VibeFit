import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.security import decode_token
from core.firebase_auth import verify_firebase_token
from models.user import User
from services.cache_service import CacheService
from services.ai_service import AIService

bearer = HTTPBearer()
_ai_service: AIService | None = None

# Process-wide so the image-hash cache actually persists between requests;
# a per-request instance would never hit.
_cache = CacheService()


def get_ai_service() -> AIService:
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service


async def get_cache() -> CacheService:
    return _cache


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials

    # 1) Firebase ID token (mobile app's primary auth). Auto-provisions the
    #    user row on first request so Firebase-authenticated users exist locally.
    claims = verify_firebase_token(token)
    if claims and claims.get("uid"):
        result = await db.execute(select(User).where(User.id == claims["uid"]))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                id=claims["uid"],
                email=claims.get("email") or f"{claims['uid']}@firebase.local",
                name=claims.get("name") or "VibeFit User",
                hashed_password="",  # external auth; no local password
            )
            db.add(user)
            await db.flush()
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
        return user

    # 2) Internal JWT fallback (backend-issued tokens, used by tests/tools).
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
