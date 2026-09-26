"""Record when a user confirmed they are 18 or older.

A nullable timestamp on users. It is a product-eligibility statement, not
proof of age: no birth date is collected. Existing accounts start as NULL and
are asked once.

The baseline revision builds `users` from the live model, so a fresh database
already has this column by the time this runs; only an existing database
(production) needs it added.

Revision ID: 0009_age_confirmation
Revises: 0008_pending_photo_deletions
"""
import sqlalchemy as sa
from alembic import op

revision = "0009_age_confirmation"
down_revision = "0008_pending_photo_deletions"
branch_labels = None
depends_on = None


def _has_column() -> bool:
    columns = sa.inspect(op.get_bind()).get_columns("users")
    return any(c["name"] == "age_confirmed_at" for c in columns)


def upgrade() -> None:
    if _has_column():
        return
    op.add_column("users", sa.Column("age_confirmed_at", sa.DateTime(timezone=True),
                                     nullable=True))


def downgrade() -> None:
    op.drop_column("users", "age_confirmed_at")
