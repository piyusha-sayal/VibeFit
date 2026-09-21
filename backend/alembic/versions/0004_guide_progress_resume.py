"""Add resume state to guide_progress.

Additive only: two nullable columns on a table added in 0003. No existing
column is altered and no data is moved, so applying this cannot lose anything
and the downgrade only drops the two columns it added.

Revision ID: 0004_guide_resume
Revises: 0003_beauty_passport
"""
import sqlalchemy as sa
from alembic import op

revision = "0004_guide_resume"
down_revision = "0003_beauty_passport"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("guide_progress", sa.Column("last_step", sa.Integer(), nullable=True))
    op.add_column(
        "guide_progress",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("guide_progress", "updated_at")
    op.drop_column("guide_progress", "last_step")
