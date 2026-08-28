"""baseline schema (all tables, incl. skin_analysis + quality)

No prior migration history existed and the app does not create tables at startup,
so this is the initial baseline: it creates every table from the SQLAlchemy
models (users, analyses, recommendations, chat_sessions, chat_messages),
already including the skin_analysis (F1) and quality (F7/F11) JSON columns.

Uses metadata create_all/drop_all so the schema always matches the models.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-06-01
"""
from alembic import op

import models  # noqa: F401 — registers all model tables on Base.metadata
from core.database import Base


revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
