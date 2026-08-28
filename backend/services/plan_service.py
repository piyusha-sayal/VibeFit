"""Generates and persists a user's Action Plan.

Ranking and every fact in `why` come from `rules/action_plan_engine.py`
(deterministic). The AI service may only reword the `why` text — see
`_maybe_rephrase` for the traceability guard that discards anything that
changes category/title, count, or order.
"""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.profile import ActionFeedback, PlanAction
from rules.action_plan_engine import build_action_plan
from schemas.plan import ActionPlanOut, PlanActionOut
from services.ai_service import AIService
from services.profile_service import build_vibe_profile, get_latest_analysis


async def _maybe_rephrase(ai: AIService, actions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not actions:
        return actions
    try:
        rephrased = await ai.rephrase_plan_actions(actions)
    except Exception:
        return actions
    if not rephrased or len(rephrased) != len(actions):
        return actions

    merged: list[dict[str, Any]] = []
    for original, r in zip(actions, rephrased):
        if not isinstance(r, dict) or r.get("category") != original["category"] or r.get("title") != original["title"]:
            return actions  # traceability broken — discard the whole batch, keep originals
        why = r.get("why")
        merged.append({**original, "why": why, "source": "llm_rephrase"} if why else original)
    return merged


async def _upsert_actions(db: AsyncSession, user_id: str, analysis_id: Optional[str],
                           actions: list[dict[str, Any]], is_avoid: bool,
                           existing_by_key: dict[tuple[str, str, bool], PlanAction]) -> list[PlanAction]:
    rows: list[PlanAction] = []
    for i, action in enumerate(actions):
        key = (action["category"], action["title"], is_avoid)
        row = existing_by_key.get(key)
        if row is None:
            row = PlanAction(user_id=user_id, category=action["category"], title=action["title"], is_avoid=is_avoid)
            db.add(row)
        row.analysis_id = analysis_id
        row.rank = i + 1
        row.why = action["why"]
        row.confidence_label = action["confidence_label"]
        row.limitations = action.get("limitations")
        row.items = action.get("items")
        row.source = action.get("source", "rules")
        rows.append(row)
    return rows


async def _feedback_by_action(db: AsyncSession, action_ids: list[str]) -> dict[str, list[str]]:
    if not action_ids:
        return {}
    result = await db.execute(select(ActionFeedback).where(ActionFeedback.action_id.in_(action_ids)))
    out: dict[str, list[str]] = {}
    for row in result.scalars().all():
        out.setdefault(row.action_id, []).append(row.feedback_type)
    return out


def _to_out(row: PlanAction, feedback: dict[str, list[str]]) -> PlanActionOut:
    return PlanActionOut(
        id=row.id, rank=row.rank, category=row.category, title=row.title, why=row.why,
        confidence_label=row.confidence_label, limitations=row.limitations, is_avoid=row.is_avoid,
        items=row.items, feedback=feedback.get(row.id, []),
    )


async def generate_plan(db: AsyncSession, user_id: str, ai: AIService) -> ActionPlanOut:
    profile = await build_vibe_profile(db, user_id)
    analysis = await get_latest_analysis(db, user_id)
    plan = build_action_plan(profile, analysis)

    plan["top_actions"] = await _maybe_rephrase(ai, plan["top_actions"])

    existing = (await db.execute(select(PlanAction).where(PlanAction.user_id == user_id))).scalars().all()
    existing_by_key = {(r.category, r.title, r.is_avoid): r for r in existing}

    analysis_id = analysis.id if analysis else None
    top_rows = await _upsert_actions(db, user_id, analysis_id, plan["top_actions"], False, existing_by_key)
    avoid_rows = await _upsert_actions(db, user_id, analysis_id, plan["avoid"], True, existing_by_key)
    await db.flush()

    all_ids = [r.id for r in top_rows + avoid_rows]
    feedback = await _feedback_by_action(db, all_ids)

    return ActionPlanOut(
        goal=plan["goal"],
        top_actions=[_to_out(r, feedback) for r in top_rows],
        avoid=[_to_out(r, feedback) for r in avoid_rows],
        check_in_at=plan["check_in_at"],
        generated_at=plan["generated_at"],
        profile_complete=plan["profile_complete"],
        limitations_summary=plan["limitations_summary"],
    )


async def record_feedback(db: AsyncSession, user_id: str, action_id: str,
                           feedback_type: str, note: Optional[str]) -> Optional[ActionFeedback]:
    result = await db.execute(select(PlanAction).where(PlanAction.id == action_id, PlanAction.user_id == user_id))
    action = result.scalar_one_or_none()
    if action is None:
        return None
    feedback = ActionFeedback(action_id=action_id, user_id=user_id, feedback_type=feedback_type, note=note)
    db.add(feedback)
    await db.flush()
    return feedback
