"""Persistence for the Beauty Passport: styling preferences, saved looks,
collections, goals, the activity timeline, guide progress and settings.

Deliberately narrow. Anything the onboarding questionnaire already collects
(climate, maintenance tolerance, modesty preference, style preferences, budget)
stays in `onboarding_responses` and is read from there — duplicating it here
would give two answers to the same question.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class BeautyProfile(Base):
    """Self-declared styling facts. Never derived from a body photograph."""

    __tablename__ = "beauty_profiles"

    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    # "pear" | "apple" | "hourglass" | "rectangle" | "inverted_triangle"
    # | "unsure" | "uncategorised" — the last two are first-class answers.
    body_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    height_cm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fit_preference: Mapped[str | None] = mapped_column(String(30), nullable=True)
    neckline_preferences: Mapped[list | None] = mapped_column(JSON, nullable=True)
    sleeve_preferences: Mapped[list | None] = mapped_column(JSON, nullable=True)
    silhouette_preferences: Mapped[list | None] = mapped_column(JSON, nullable=True)
    aesthetics: Mapped[list | None] = mapped_column(JSON, nullable=True)
    cultural_preferences: Mapped[list | None] = mapped_column(JSON, nullable=True)
    favourite_occasions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    hair_length: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hair_density: Mapped[str | None] = mapped_column(String(20), nullable=True)
    makeup_experience: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Style questionnaire. Kept as JSON because these are open-ended sets that
    # grow with the garment library; the structured preferences above stay in
    # their own columns and are not duplicated here.
    garment_preferences: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    sizes: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    style_quiz: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    comfort_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class SavedLook(Base):
    """A hairstyle, makeup look, outfit or complete look the user kept."""

    __tablename__ = "saved_looks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    # "hair" | "makeup" | "outfit" | "colour" | "complete"
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    # "saved" | "want_to_try" | "tried"
    status: Mapped[str] = mapped_column(String(20), default="saved", nullable=False)
    occasion: Mapped[str | None] = mapped_column(String(40), nullable=True)
    # The composed look itself: the swatches, items and notes the UI renders.
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    source_analysis_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("analyses.id", ondelete="SET NULL"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Caller-supplied idempotency key. A save or duplicate replayed after a
    # slow network returns the original row instead of creating a second one.
    client_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("user_id", "client_token", name="uq_look_client_token_per_user"),
    )


class LookDraft(Base):
    """A look in progress.

    Separate from `saved_looks` on purpose: a draft is not something the user
    has kept, and counting unfinished work in "saved looks" would misreport the
    Passport. Deleted on save.
    """

    __tablename__ = "look_drafts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    occasion: Mapped[str | None] = mapped_column(String(40), nullable=True)
    # The full composition, exactly as the builder holds it.
    composition: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # What the user asked for, so a draft can be regenerated rather than only replayed.
    brief: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now)


class LookFeedback(Base):
    """One verdict on one catalogue item.

    Lightweight and deterministic: a rejected item is demoted in future
    recommendations, never removed from the library. No training, no model, no
    cost. One row per (user, component, item) — repeated feedback updates it.
    """

    __tablename__ = "look_feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # "outfit" | "hair" | "makeup" | "jewellery" | "accessories" | "colours"
    component: Mapped[str] = mapped_column(String(20), nullable=False)
    item_key: Mapped[str] = mapped_column(String(60), nullable=False)
    # "love" | "not_my_style" | "want_to_try" | "tried"
    verdict: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("user_id", "component", "item_key", name="uq_feedback_per_item"),
    )


class LookCollection(Base):
    __tablename__ = "look_collections"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    # Default collections are created on demand and cannot be renamed away.
    slug: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_collection_name_per_user"),)


class CollectionItem(Base):
    __tablename__ = "collection_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    collection_id: Mapped[str] = mapped_column(
        String, ForeignKey("look_collections.id", ondelete="CASCADE"), nullable=False, index=True)
    look_id: Mapped[str] = mapped_column(
        String, ForeignKey("saved_looks.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    __table_args__ = (UniqueConstraint("collection_id", "look_id", name="uq_look_per_collection"),)


class BeautyGoal(Base):
    __tablename__ = "beauty_goals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    # "active" | "done" | "dropped"
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    target_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class BeautyActivity(Base):
    """Append-only timeline. Written by the features themselves, never seeded."""

    __tablename__ = "beauty_activities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # "analysis" | "look_saved" | "look_tried" | "goal" | "guide" | "profile"
    kind: Mapped[str] = mapped_column(String(30), nullable=False)
    summary: Mapped[str] = mapped_column(String(200), nullable=False)
    ref_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


class GuideProgress(Base):
    __tablename__ = "guide_progress"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    guide_slug: Mapped[str] = mapped_column(String(80), nullable=False)
    saved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Where the reader stopped, so a guide can be resumed rather than restarted.
    last_step: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (UniqueConstraint("user_id", "guide_slug", name="uq_guide_per_user"),)


class UserSettings(Base):
    """Only settings the app actually honours. No dead switches."""

    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    # "system" | "light" | "dark"
    theme: Mapped[str] = mapped_column(String(10), default="system", nullable=False)
    reduced_motion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    country: Mapped[str | None] = mapped_column(String(60), nullable=True)
    language: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Photographs are only reused for a second analysis with this set.
    photo_reuse_consent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Off by default: the analysis keeps its results, the photograph itself is
    # removed once the scan finishes. Turning it on is what makes a photograph
    # outlive the request that carried it.
    photo_retention_consent: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
