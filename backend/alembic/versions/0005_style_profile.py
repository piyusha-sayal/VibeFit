"""Add style questionnaire storage to beauty_profiles.

Additive only: four nullable columns on a table added in 0003. No existing
column is altered, no data is moved, and the downgrade drops only what this
adds. Body type, fit, neckline, sleeve, silhouette, aesthetic and cultural
preferences already exist and are reused rather than duplicated.

Revision ID: 0005_style_profile
Revises: 0004_guide_resume
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0005_style_profile"
down_revision = "0004_guide_resume"
branch_labels = None
depends_on = None

# JSON on SQLite (tests), JSONB on Postgres (production).
_JSON = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.add_column("beauty_profiles", sa.Column("garment_preferences", _JSON, nullable=True))
    op.add_column("beauty_profiles", sa.Column("sizes", _JSON, nullable=True))
    op.add_column("beauty_profiles", sa.Column("style_quiz", _JSON, nullable=True))
    op.add_column("beauty_profiles", sa.Column("comfort_notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("beauty_profiles", "comfort_notes")
    op.drop_column("beauty_profiles", "style_quiz")
    op.drop_column("beauty_profiles", "sizes")
    op.drop_column("beauty_profiles", "garment_preferences")
