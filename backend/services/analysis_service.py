import uuid
import asyncio
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from models.analysis import Analysis, Recommendation
from ml.face_analysis import analyze_face
from ml.color_analysis import analyze_colors
from ml.hair_analysis import analyze_hair
from ml.body_analysis import analyze_body
from ml.skin_analysis import analyze_skin
from ml.quality import assess_quality
from ml.feature_analysis import analyze_features
from .ai_service import AIService
from .cache_service import CacheService
from rules.engine import build_rule_recommendations, merge_recommendations
from rules.body_guidance import body_balance_tips
from .progress import build_progress
from .aggregate import aggregate_analysis


# Analysis runs as an in-process background task, so a server restart mid-run
# would strand a row in "processing" forever. Anything older than this is
# reported as failed so the app can offer a retry instead of polling on nothing.
STALE_PROCESSING_AFTER = timedelta(minutes=10)


def _is_stale_processing(analysis: Analysis) -> bool:
    if analysis.status != "processing" or analysis.created_at is None:
        return False
    created = analysis.created_at
    if created.tzinfo is None:  # SQLite hands back naive datetimes
        created = created.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - created > STALE_PROCESSING_AFTER


def _merge_features(face: dict, features: dict) -> dict:
    """Fold feature scores / canon / eyebrow into the face dict + overall /10."""
    merged = {**face}
    scores = features.get("featureScores") or {}
    if scores:
        merged["featureScores"] = scores
        merged["overallScore"] = round(sum(scores.values()) / len(scores) / 10.0, 1)
    if features.get("canon"):
        merged["canon"] = features["canon"]
    if features.get("eyebrow"):
        merged["eyebrow"] = features["eyebrow"]
    return merged


class AnalysisService:
    def __init__(self, db: AsyncSession, cache: CacheService, ai: AIService) -> None:
        self._db = db
        self._cache = cache
        self._ai = ai

    async def _run_ml(self, image_bytes: bytes) -> dict:
        """Run all analyzers on one image -> dict of result blocks (hash-cached)."""
        img_key = f"imghash:{hashlib.sha256(image_bytes).hexdigest()}"
        cached = await self._cache.get(img_key)  # F12: skip recompute
        if cached:
            return cached
        # Sequential, not gathered. Each analyzer builds its own MediaPipe graph
        # (5 of the 7 build a FaceMesh, 2 a Pose) and each loads its own copy of
        # the TFLite weights. Running them concurrently held all seven in memory
        # at once, which OOM-killed the 512 MB container on the second scan --
        # reproducibly: scan 1 succeeded, scan 2 took the process down, scan 3
        # got a 502. Sequencing them caps peak memory at one analyzer.
        # Still off the event loop, so the request stays responsive.
        face = await asyncio.to_thread(analyze_face, image_bytes)
        colors = await asyncio.to_thread(analyze_colors, image_bytes)
        hair = await asyncio.to_thread(analyze_hair, image_bytes)
        body = await asyncio.to_thread(analyze_body, image_bytes)
        skin = await asyncio.to_thread(analyze_skin, image_bytes)
        quality = await asyncio.to_thread(assess_quality, image_bytes)
        features = await asyncio.to_thread(analyze_features, image_bytes)
        face = _merge_features(face, features)
        if body.get("shape"):
            body = {**body, "guidance": body_balance_tips(body)}
        result = {"face": face, "colors": colors, "hair": hair,
                  "body": body, "skin": skin, "quality": quality}
        await self._cache.set(img_key, result, ttl=3600)
        return result

    async def _finalize(self, analysis: Analysis, ml: dict, user_id: str) -> Analysis:
        """Store ML blocks + derived recommendations on the analysis row."""
        analysis.face_analysis = ml.get("face")
        analysis.color_analysis = ml.get("colors")
        analysis.hair_analysis = ml.get("hair")
        analysis.body_analysis = ml.get("body")
        analysis.skin_analysis = ml.get("skin")
        analysis.quality = ml.get("quality")
        analysis.status = "complete"

        rule_recs = build_rule_recommendations(ml.get("face"), ml.get("colors"), ml.get("body"))
        try:
            llm_recs = await self._ai.generate_recommendations(
                ml.get("face"), ml.get("colors"), ml.get("hair"))
        except Exception:
            llm_recs = []
        for r in merge_recommendations(rule_recs, llm_recs):
            self._db.add(Recommendation(analysis_id=analysis.id, **r))

        await self._db.flush()
        # Load the recommendations relationship now (within the async greenlet)
        # so response serialization doesn't trigger lazy IO outside it.
        await self._db.refresh(analysis, attribute_names=["recommendations"])
        await self._cache.invalidate_prefix(f"analysis:{user_id}:")
        return analysis

    async def create_pending(self, user_id: str, image_url: str) -> Analysis:
        """Insert the row and return immediately so the request doesn't block on
        ML. The caller schedules run_pending/run_pending_multi as a background
        task. Recommendations are refreshed here (empty at this point) so
        response serialization never triggers lazy IO outside the greenlet."""
        analysis = Analysis(id=str(uuid.uuid4()), user_id=user_id,
                            image_url=image_url, status="processing")
        self._db.add(analysis)
        await self._db.flush()
        await self._db.refresh(analysis, attribute_names=["recommendations"])
        return analysis

    async def _load_row(self, analysis_id: str, user_id: str) -> Optional[Analysis]:
        result = await self._db.execute(
            select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def _fail(self, analysis: Analysis, exc: Exception) -> Analysis:
        analysis.status = "failed"
        analysis.error_message = str(exc)
        await self._db.flush()
        return analysis

    async def run_pending(self, analysis_id: str, user_id: str, image_bytes: bytes) -> Optional[Analysis]:
        """Run the ML pipeline for an already-created pending row."""
        analysis = await self._load_row(analysis_id, user_id)
        if analysis is None:
            return None
        try:
            ml = await self._run_ml(image_bytes)
        except Exception as exc:
            return await self._fail(analysis, exc)
        return await self._finalize(analysis, ml, user_id)

    async def run_pending_multi(self, analysis_id: str, user_id: str, images: list[bytes]) -> Optional[Analysis]:
        """F10: run ML per frame, aggregate to stabler scores, persist one row."""
        analysis = await self._load_row(analysis_id, user_id)
        if analysis is None:
            return None
        try:
            per_image = [await self._run_ml(b) for b in images]
            ml = aggregate_analysis(per_image)
        except Exception as exc:
            return await self._fail(analysis, exc)
        return await self._finalize(analysis, ml, user_id)

    async def get_by_id(self, analysis_id: str, user_id: str) -> Optional[Analysis]:
        cache_key = f"analysis:{user_id}:{analysis_id}"
        cached = await self._cache.get(cache_key)
        if cached:
            return cached

        analysis = await self._load_row(analysis_id, user_id)
        if analysis is not None and _is_stale_processing(analysis):
            return await self._fail(analysis, RuntimeError("Analysis timed out. Please try again."))
        return analysis

    async def get_latest(self, user_id: str) -> Optional[Analysis]:
        result = await self._db.execute(
            select(Analysis)
            .where(Analysis.user_id == user_id, Analysis.status == "complete")
            .order_by(desc(Analysis.created_at))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_progress(self, user_id: str, limit: int = 20) -> dict:
        """Trend deltas across the user's completed analyses (oldest->newest)."""
        result = await self._db.execute(
            select(Analysis)
            .where(Analysis.user_id == user_id, Analysis.status == "complete")
            .order_by(desc(Analysis.created_at))
            .limit(limit)
        )
        rows = list(result.scalars().all())
        rows.reverse()  # oldest first for trend direction
        snapshots = [
            {
                "date": a.created_at.isoformat() if a.created_at else None,
                "face": a.face_analysis,
                "skin": a.skin_analysis,
            }
            for a in rows
        ]
        return build_progress(snapshots)

    async def list_analyses(self, user_id: str, page: int = 1, limit: int = 20) -> list[Analysis]:
        offset = (page - 1) * limit
        result = await self._db.execute(
            select(Analysis)
            .where(Analysis.user_id == user_id)
            .order_by(desc(Analysis.created_at))
            .offset(offset).limit(limit)
        )
        return list(result.scalars().all())

    async def delete(self, analysis_id: str, user_id: str) -> bool:
        result = await self._db.execute(
            select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user_id)
        )
        analysis = result.scalar_one_or_none()
        if not analysis:
            return False
        await self._db.delete(analysis)
        await self._cache.delete(f"analysis:{user_id}:{analysis_id}")
        return True
