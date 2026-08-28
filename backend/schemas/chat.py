from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SendMessageRequest(BaseModel):
    content: str
    session_id: Optional[str] = None
    analysis_id: Optional[str] = None


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionOut(BaseModel):
    id: str
    analysis_id: Optional[str] = None
    messages: list[ChatMessageOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionListItem(BaseModel):
    id: str
    analysis_id: Optional[str] = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
