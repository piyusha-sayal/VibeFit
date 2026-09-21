from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from core.database import get_db
from models.analysis import Analysis
from models.user import User
from rules.color_palettes import SEASONS
from rules.color_season import build_color_report

router = APIRouter(prefix="/color", tags=["color"])


async def _latest_complete(db: AsyncSession, user_id: str) -> Analysis | None:
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == user_id, Analysis.status == "complete")
        .order_by(desc(Analysis.created_at))
        .limit(1)
    )
    return result.scalars().first()


def _lighting_ok(analysis: Analysis) -> bool:
    """A flagged-quality photo cannot support a confident colour call."""
    quality = analysis.quality or {}
    if quality.get("lighting") in {"poor", "low"}:
        return False
    return bool(quality.get("acceptable", True))


@router.get("/seasons")
async def list_seasons():
    """The full twelve-season reference, for the explorer screens.

    Static data, so it needs no analysis and no authentication.
    """
    return {
        "seasons": [
            {
                "season": key,
                "label": data["label"],
                "family": data["family"],
                "summary": data["summary"],
                "undertone": data["family"],
                "palettes": {"best": data["best"], "neutrals": data["neutrals"]},
            }
            for key, data in SEASONS.items()
        ]
    }


@router.get("/seasons/{season}")
async def get_season(season: str):
    data = SEASONS.get(season)
    if not data:
        raise HTTPException(status_code=404, detail="Unknown season")
    return {"season": season, **data}


@router.get("/report")
async def get_color_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The signed-in user's personal-colour report, from their latest scan."""
    analysis = await _latest_complete(db, current_user.id)
    if not analysis:
        raise HTTPException(status_code=404, detail="No completed analysis yet")
    report = build_color_report(analysis.color_analysis, lighting_ok=_lighting_ok(analysis))
    if not report:
        # A scan can complete with no usable colour block (no face found).
        raise HTTPException(status_code=404, detail="This scan has no colour analysis to report on")
    return {**report, "analysisId": analysis.id, "createdAt": analysis.created_at}
