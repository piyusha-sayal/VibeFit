"""baseline schema (all tables, incl. skin_analysis + quality)

No prior migration history existed and the app does not create tables at startup,
so this is the initial baseline: it creates every table from the SQLAlchemy
models (users, analyses, recommendations, chat_sessions, chat_messages),
already including the skin_analysis (F1) and quality (F7/F11) JSON columns.

Creates only the tables that existed at THIS revision, named explicitly.

It previously called Base.metadata.create_all() with no table filter, which
creates whatever the models happen to define *today* — so once 0002 added the
profile/plan models, this revision started creating those tables too and 0002
then failed with DuplicateTableError. A migration must be a fixed snapshot of
history, not a live mirror of the models, or every new model breaks the chain.

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

# Frozen: the schema as of this revision. Do not add to this list — new tables
# belong in their own migration.
BASELINE_TABLES = (
    "users",
    "analyses",
    "recommendations",
    "chat_sessions",
    "chat_messages",
)


def _tables():
    return [Base.metadata.tables[name] for name in BASELINE_TABLES]


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind(), tables=_tables())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind(), tables=_tables())
