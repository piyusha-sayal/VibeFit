"""add onboarding, profile corrections, action plan, action feedback tables

Explicit table creation (not metadata.create_all like 0001) so upgrade/downgrade
are precise about what this revision adds.

Revision ID: 0002_profile_plan
Revises: 0001_baseline
Create Date: 2026-08-25
"""
import sqlalchemy as sa
from alembic import op

revision = "0002_profile_plan"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "onboarding_responses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"),
                   nullable=False, unique=True, index=True),
        sa.Column("primary_goal", sa.String(50), nullable=True),
        sa.Column("areas_of_interest", sa.JSON(), nullable=True),
        sa.Column("budget_range", sa.String(20), nullable=True),
        sa.Column("market", sa.String(80), nullable=True),
        sa.Column("climate", sa.String(40), nullable=True),
        sa.Column("climate_consent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("skin_sensitivities", sa.JSON(), nullable=True),
        sa.Column("declared_allergies", sa.JSON(), nullable=True),
        sa.Column("hair_texture_reported", sa.String(20), nullable=True),
        sa.Column("hair_treatment_history", sa.JSON(), nullable=True),
        sa.Column("current_routine", sa.Text(), nullable=True),
        sa.Column("style_preferences", sa.JSON(), nullable=True),
        sa.Column("maintenance_tolerance", sa.String(20), nullable=True),
        sa.Column("time_available", sa.String(20), nullable=True),
        sa.Column("keep_using_items", sa.Text(), nullable=True),
        sa.Column("gender_presentation", sa.String(40), nullable=True),
        sa.Column("modesty_preference", sa.String(40), nullable=True),
        sa.Column("skipped_fields", sa.JSON(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "profile_corrections",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"),
                   nullable=False, index=True),
        sa.Column("attribute_key", sa.String(60), nullable=False, index=True),
        sa.Column("corrected_value", sa.JSON(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "plan_actions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"),
                   nullable=False, index=True),
        sa.Column("analysis_id", sa.String(), sa.ForeignKey("analyses.id", ondelete="SET NULL"),
                   nullable=True),
        sa.Column("rank", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("why", sa.Text(), nullable=False),
        sa.Column("confidence_label", sa.String(30), nullable=False),
        sa.Column("limitations", sa.Text(), nullable=True),
        sa.Column("is_avoid", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("source", sa.String(20), nullable=False, server_default="rules"),
        sa.Column("items", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "action_feedback",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("action_id", sa.String(), sa.ForeignKey("plan_actions.id", ondelete="CASCADE"),
                   nullable=False, index=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"),
                   nullable=False, index=True),
        sa.Column("feedback_type", sa.String(30), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("action_feedback")
    op.drop_table("plan_actions")
    op.drop_table("profile_corrections")
    op.drop_table("onboarding_responses")
