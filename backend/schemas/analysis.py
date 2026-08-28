from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class RecommendationOut(BaseModel):
    id: str
    category: str
    title: str
    description: Optional[str] = None
    confidence: float
    items: Optional[list[Any]] = None

    model_config = {"from_attributes": True}


class AnalysisOut(BaseModel):
    id: str
    user_id: str
    image_url: str
    status: str
    face_analysis: Optional[dict] = None
    color_analysis: Optional[dict] = None
    hair_analysis: Optional[dict] = None
    body_analysis: Optional[dict] = None
    skin_analysis: Optional[dict] = None
    quality: Optional[dict] = None
    recommendations: list[RecommendationOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AnalysisListItem(BaseModel):
    id: str
    status: str
    image_url: str
    created_at: datetime

    model_config = {"from_attributes": True}
