import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    analyses: Mapped[list["Analysis"]] = relationship("Analysis", back_populates="user", lazy="selectin")
    chat_sessions: Mapped[list["ChatSession"]] = relationship("ChatSession", back_populates="user", lazy="selectin")
    onboarding: Mapped["OnboardingResponse | None"] = relationship(
        "OnboardingResponse", back_populates="user", uselist=False, cascade="all, delete-orphan")
    corrections: Mapped[list["ProfileCorrection"]] = relationship(
        "ProfileCorrection", back_populates="user", cascade="all, delete-orphan")
    plan_actions: Mapped[list["PlanAction"]] = relationship(
        "PlanAction", back_populates="user", cascade="all, delete-orphan")
