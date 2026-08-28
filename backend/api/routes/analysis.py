import uuid
import asyncio
import boto3
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
import io
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from core.config import settings
from models.user import User
from schemas.analysis import AnalysisOut, AnalysisListItem
from services.analysis_service import AnalysisService
from services.cache_service import CacheService
from services.ai_service import AIService
from services.report_service import generate_face_report
from services.card_service import generate_summary_card
from ml.overlay import annotate_face
from api.deps import get_current_user, get_cache, get_ai_service

router = APIRouter(prefix="/analysis", tags=["analysis"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


_s3_client = None


def _get_s3():
    """Build the boto3 S3 client once and reuse it (clients are thread-safe)."""
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )
    return _s3_client


async def _upload_to_s3(data: bytes, content_type: str) -> str:
    if not settings.aws_access_key_id:
        return f"local://{uuid.uuid4()}"
    key = f"uploads/{uuid.uuid4()}"
    _get_s3().put_object(Bucket=settings.aws_s3_bucket, Key=key, Body=data, ContentType=content_type)
    return f"https://{settings.aws_s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"


@router.post("/upload", response_model=AnalysisOut, status_code=201)
async def upload_and_analyze(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=422, detail="File must be JPEG, PNG, or WebP")

    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB limit")

    image_url = await _upload_to_s3(data, file.content_type or "image/jpeg")
    svc = AnalysisService(db, cache, ai)
    analysis = await svc.create_and_analyze(current_user.id, data, image_url)
    return analysis


@router.post("/upload-multi", response_model=AnalysisOut, status_code=201)
async def upload_multi_and_analyze(
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    """Analyze several photos of the same person and aggregate (F10)."""
    if not files:
        raise HTTPException(status_code=422, detail="At least one image required")
    if len(files) > 5:
        raise HTTPException(status_code=422, detail="Up to 5 images allowed")

    images: list[bytes] = []
    first_url = ""
    for f in files:
        if f.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=422, detail="File must be JPEG, PNG, or WebP")
        data = await f.read()
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Image exceeds 10 MB limit")
        images.append(data)
        if not first_url:
            first_url = await _upload_to_s3(data, f.content_type or "image/jpeg")

    svc = AnalysisService(db, cache, ai)
    return await svc.create_and_analyze_multi(current_user.id, images, first_url)


@router.post("/overlay")
async def annotated_overlay(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Return the uploaded photo with facial thirds/fifths guides drawn (F3)."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=422, detail="File must be JPEG, PNG, or WebP")
    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB limit")
    png = await asyncio.to_thread(annotate_face, data)
    return StreamingResponse(io.BytesIO(png), media_type="image/png")


@router.get("/latest", response_model=AnalysisOut)
async def get_latest(
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    svc = AnalysisService(db, cache, ai)
    analysis = await svc.get_latest(current_user.id)
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found")
    return analysis


@router.get("", response_model=list[AnalysisListItem])
async def list_analyses(
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    svc = AnalysisService(db, cache, ai)
    return await svc.list_analyses(current_user.id, page, limit)


@router.get("/progress")
async def get_progress(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    """Metric trend deltas across the user's analyses (F13)."""
    svc = AnalysisService(db, cache, ai)
    return await svc.get_progress(current_user.id, limit)


@router.get("/{analysis_id}", response_model=AnalysisOut)
async def get_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    svc = AnalysisService(db, cache, ai)
    analysis = await svc.get_by_id(analysis_id, current_user.id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.get("/{analysis_id}/report")
async def get_analysis_report(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    svc = AnalysisService(db, cache, ai)
    analysis = await svc.get_by_id(analysis_id, current_user.id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    pdf = generate_face_report(analysis, user_name=current_user.name)
    headers = {"Content-Disposition": f'attachment; filename="vibefit-report-{analysis_id}.pdf"'}
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf", headers=headers)


@router.get("/{analysis_id}/card")
async def get_summary_card(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    """Return a shareable PNG summary card for the analysis (F6)."""
    svc = AnalysisService(db, cache, ai)
    analysis = await svc.get_by_id(analysis_id, current_user.id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    png = await asyncio.to_thread(generate_summary_card, analysis, current_user.name)
    headers = {"Content-Disposition": f'attachment; filename="vibefit-card-{analysis_id}.png"'}
    return StreamingResponse(io.BytesIO(png), media_type="image/png", headers=headers)


@router.delete("/{analysis_id}", status_code=204)
async def delete_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    cache: CacheService = Depends(get_cache),
    ai: AIService = Depends(get_ai_service),
    current_user: User = Depends(get_current_user),
):
    svc = AnalysisService(db, cache, ai)
    deleted = await svc.delete(analysis_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Analysis not found")
