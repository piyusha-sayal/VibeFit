import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import String, ForeignKey, DateTime, JSON, Text, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class OnboardingResponse(Base):
    """Goal-first onboarding answers. One row per user (upserted)."""
    __tablename__ = "onboarding_responses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"),
                                          nullable=False, unique=True, index=True)

    primary_goal: Mapped[str | None] = mapped_column(String(50), nullable=True)
    areas_of_interest: Mapped[list | None] = mapped_column(JSON, nullable=True)
    budget_range: Mapped[str | None] = mapped_column(String(20), nullable=True)
    market: Mapped[str | None] = mapped_column(String(80), nullable=True)
    climate: Mapped[str | None] = mapped_column(String(40), nullable=True)
    climate_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    skin_sensitivities: Mapped[list | None] = mapped_column(JSON, nullable=True)
    declared_allergies: Mapped[list | None] = mapped_column(JSON, nullable=True)
    hair_texture_reported: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hair_treatment_history: Mapped[list | None] = mapped_column(JSON, nullable=True)
    current_routine: Mapped[str | None] = mapped_column(Text, nullable=True)
    style_preferences: Mapped[list | None] = mapped_column(JSON, nullable=True)
    maintenance_tolerance: Mapped[str | None] = mapped_column(String(20), nullable=True)
    time_available: Mapped[str | None] = mapped_column(String(20), nullable=True)
    keep_using_items: Mapped[str | None] = mapped_column(Text, nullable=True)
    gender_presentation: Mapped[str | None] = mapped_column(String(40), nullable=True)
    modesty_preference: Mapped[str | None] = mapped_column(String(40), nullable=True)
    skipped_fields: Mapped[list | None] = mapped_column(JSON, nullable=True)

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                  default=lambda: datetime.now(timezone.utc),
                                                  onupdate=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User", back_populates="onboarding")


class ProfileCorrection(Base):
    """A user-entered override for one derived attribute. Append-only audit
    trail — the original scan/questionnaire value is never rewritten; the
    Vibe Profile view prefers the latest correction per attribute_key but the
    full history stays queryable."""
    __tablename__ = "profile_corrections"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"),
                                          nullable=False, index=True)
    attribute_key: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    corrected_value: Mapped[Any] = mapped_column(JSON, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User", back_populates="corrections")


class PlanAction(Base):
    """One recommended (or avoid-listed) action in a user's Action Plan.
    Identity is (user_id, category, title, is_avoid) so regenerating the plan
    updates existing rows in place instead of duplicating — feedback stays
    attached across regenerations."""
    __tablename__ = "plan_actions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"),
                                          nullable=False, index=True)
    analysis_id: Mapped[str | None] = mapped_column(String, ForeignKey("analyses.id", ondelete="SET NULL"),
                                                      nullable=True)
    rank: Mapped[int] = mapped_column(Integer, default=0)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    why: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_label: Mapped[str] = mapped_column(String(30), nullable=False)
    limitations: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_avoid: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(20), default="rules")
    items: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                  default=lambda: datetime.now(timezone.utc),
                                                  onupdate=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User", back_populates="plan_actions")
    feedback: Mapped[list["ActionFeedback"]] = relationship(
        "ActionFeedback", back_populates="action", lazy="selectin", cascade="all, delete-orphan")


class ActionFeedback(Base):
    """User feedback on a plan action (saved/completed/not_relevant/etc).
    Append-only so repeat feedback over time can later inform ranking."""
    __tablename__ = "action_feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    action_id: Mapped[str] = mapped_column(String, ForeignKey("plan_actions.id", ondelete="CASCADE"),
                                            nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"),
                                          nullable=False, index=True)
    feedback_type: Mapped[str] = mapped_column(String(30), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    action: Mapped["PlanAction"] = relationship("PlanAction", back_populates="feedback")
