"""add beauty passport tables: profile, looks, collections, goals, activity, guides, settings

Explicit table creation, matching 0002, so upgrade/downgrade say exactly what
this revision touches. Nothing existing is altered — every table here is new,
and the onboarding questionnaire stays the single home for the preferences it
already collects.

Revision ID: 0003_beauty_passport
Revises: 0002_profile_plan
Create Date: 2026-09-21
"""
import sqlalchemy as sa
from alembic import op

revision = "0003_beauty_passport"
down_revision = "0002_profile_plan"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "beauty_profiles",
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("body_type", sa.String(length=30), nullable=True),
        sa.Column("height_cm", sa.Integer(), nullable=True),
        sa.Column("fit_preference", sa.String(length=30), nullable=True),
        sa.Column("neckline_preferences", sa.JSON(), nullable=True),
        sa.Column("sleeve_preferences", sa.JSON(), nullable=True),
        sa.Column("silhouette_preferences", sa.JSON(), nullable=True),
        sa.Column("aesthetics", sa.JSON(), nullable=True),
        sa.Column("cultural_preferences", sa.JSON(), nullable=True),
        sa.Column("favourite_occasions", sa.JSON(), nullable=True),
        sa.Column("hair_length", sa.String(length=20), nullable=True),
        sa.Column("hair_density", sa.String(length=20), nullable=True),
        sa.Column("makeup_experience", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "saved_looks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="saved"),
        sa.Column("occasion", sa.String(length=40), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("source_analysis_id", sa.String(), sa.ForeignKey("analyses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "look_collections",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("slug", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "name", name="uq_collection_name_per_user"),
    )

    op.create_table(
        "collection_items",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("collection_id", sa.String(), sa.ForeignKey("look_collections.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("look_id", sa.String(), sa.ForeignKey("saved_looks.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("collection_id", "look_id", name="uq_look_per_collection"),
    )

    op.create_table(
        "beauty_goals",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("target_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "beauty_activities",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("kind", sa.String(length=30), nullable=False),
        sa.Column("summary", sa.String(length=200), nullable=False),
        sa.Column("ref_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, index=True),
    )

    op.create_table(
        "guide_progress",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("guide_slug", sa.String(length=80), nullable=False),
        sa.Column("saved", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "guide_slug", name="uq_guide_per_user"),
    )

    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("theme", sa.String(length=10), nullable=False, server_default="system"),
        sa.Column("reduced_motion", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("country", sa.String(length=60), nullable=True),
        sa.Column("language", sa.String(length=20), nullable=True),
        sa.Column("photo_reuse_consent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("user_settings")
    op.drop_table("guide_progress")
    op.drop_table("beauty_activities")
    op.drop_table("beauty_goals")
    op.drop_table("collection_items")
    op.drop_table("look_collections")
    op.drop_table("saved_looks")
    op.drop_table("beauty_profiles")
