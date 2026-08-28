from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from models.user import User
from schemas.chat import SendMessageRequest, ChatSessionOut, ChatMessageOut
from services.chat_service import ChatService
from services.ai_service import AIService
from api.deps import get_current_user, get_ai_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message", response_model=ChatSessionOut)
async def send_message(
    body: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    if not body.content.strip():
        raise HTTPException(status_code=422, detail="Message content is required")

    svc = ChatService(db, ai)
    session, _, _ = await svc.send_message(current_user.id, body.content.strip(), body.session_id, body.analysis_id)
    return session


@router.get("/sessions", response_model=list[ChatSessionOut])
async def list_sessions(
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    svc = ChatService(db, ai)
    return await svc.list_sessions(current_user.id, page, limit)


@router.get("/sessions/{session_id}", response_model=ChatSessionOut)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    svc = ChatService(db, ai)
    session = await svc.get_session(session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    svc = ChatService(db, ai)
    deleted = await svc.delete_session(session_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
