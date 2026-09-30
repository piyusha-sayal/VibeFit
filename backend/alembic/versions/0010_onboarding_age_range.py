"""Add a self-reported age bracket to onboarding answers.

A short string such as "25-34", chosen by the person and always skippable.
No birth date is collected. Existing rows start as NULL.

The baseline revision builds tables from the live model, so a fresh database
already has this column by the time this runs; only an existing database
(production) needs it added.

Revision ID: 0010_onboarding_age_range
Revises: 0009_age_confirmation
"""
import sqlalchemy as sa
from alembic import op

revision = "0010_onboarding_age_range"
down_revision = "0009_age_confirmation"
branch_labels = None
depends_on = None


def _has_column() -> bool:
    columns = sa.inspect(op.get_bind()).get_columns("onboarding_responses")
    return any(c["name"] == "age_range" for c in columns)


def upgrade() -> None:
    if _has_column():
        return
    op.add_column("onboarding_responses", sa.Column("age_range", sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column("onboarding_responses", "age_range")
