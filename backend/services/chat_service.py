import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from models.analysis import ChatSession, ChatMessage, Analysis
from .ai_service import AIService


class ChatService:
    def __init__(self, db: AsyncSession, ai: AIService) -> None:
        self._db = db
        self._ai = ai

    async def get_or_create_session(self, user_id: str, session_id: Optional[str], analysis_id: Optional[str]) -> ChatSession:
        if session_id:
            result = await self._db.execute(
                select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
            )
            session = result.scalar_one_or_none()
            if session:
                return session

        session = ChatSession(id=str(uuid.uuid4()), user_id=user_id, analysis_id=analysis_id)
        self._db.add(session)
        await self._db.flush()
        return session

    async def send_message(self, user_id: str, content: str, session_id: Optional[str], analysis_id: Optional[str]) -> tuple[ChatSession, ChatMessage, ChatMessage]:
        session = await self.get_or_create_session(user_id, session_id, analysis_id)

        user_msg = ChatMessage(id=str(uuid.uuid4()), session_id=session.id, role="user", content=content)
        self._db.add(user_msg)
        await self._db.flush()

        # Load chat history
        result = await self._db.execute(
            select(ChatMessage).where(ChatMessage.session_id == session.id).order_by(ChatMessage.created_at).limit(20)
        )
        history = [{"role": m.role, "content": m.content} for m in result.scalars().all()]

        # Load analysis context
        analysis_ctx = None
        aid = session.analysis_id or analysis_id
        if aid:
            ar = await self._db.execute(select(Analysis).where(Analysis.id == aid, Analysis.user_id == user_id))
            a = ar.scalar_one_or_none()
            if a:
                analysis_ctx = {"face": a.face_analysis, "color": a.color_analysis, "hair": a.hair_analysis}

        reply_text = await self._ai.chat(content, history[:-1], analysis_ctx)
        ai_msg = ChatMessage(id=str(uuid.uuid4()), session_id=session.id, role="assistant", content=reply_text)
        self._db.add(ai_msg)
        await self._db.flush()

        return session, user_msg, ai_msg

    async def get_session(self, session_id: str, user_id: str) -> Optional[ChatSession]:
        result = await self._db.execute(
            select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_sessions(self, user_id: str, page: int = 1, limit: int = 20) -> list[ChatSession]:
        offset = (page - 1) * limit
        result = await self._db.execute(
            select(ChatSession)
            .where(ChatSession.user_id == user_id)
            .order_by(desc(ChatSession.updated_at))
            .offset(offset).limit(limit)
        )
        return list(result.scalars().all())

    async def delete_session(self, session_id: str, user_id: str) -> bool:
        result = await self._db.execute(
            select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            return False
        await self._db.delete(session)
        return True
