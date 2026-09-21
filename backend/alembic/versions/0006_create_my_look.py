"""Create My Look: drafts, feedback and save idempotency.

Additive only.

- `saved_looks` gains one nullable column and a unique constraint scoped to
  (user_id, client_token). NULLs do not collide in Postgres or SQLite, so every
  existing row — which has no token — stays valid and untouched.
- Two new tables. Nothing is dropped, altered or moved, and no existing saved
  look, collection or user record is read or rewritten by this migration.

The downgrade removes exactly what the upgrade adds and nothing else.

Revision ID: 0006_create_my_look
Revises: 0005_style_profile
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0006_create_my_look"
down_revision = "0005_style_profile"
branch_labels = None
depends_on = None

# JSON on SQLite (tests), JSONB on Postgres (production).
_JSON = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    # Batch mode: SQLite cannot ALTER in a constraint, so alembic recreates the
    # table there. On Postgres this emits a plain ADD COLUMN and ADD CONSTRAINT.
    with op.batch_alter_table("saved_looks") as batch_op:
        batch_op.add_column(sa.Column("client_token", sa.String(length=64), nullable=True))
        batch_op.create_unique_constraint(
            "uq_look_client_token_per_user", ["user_id", "client_token"])

    op.create_table(
        "look_drafts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(length=120), nullable=True),
        sa.Column("occasion", sa.String(length=40), nullable=True),
        sa.Column("composition", _JSON, nullable=True),
        sa.Column("brief", _JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "look_feedback",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("component", sa.String(length=20), nullable=False),
        sa.Column("item_key", sa.String(length=60), nullable=False),
        sa.Column("verdict", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "component", "item_key", name="uq_feedback_per_item"),
    )


def downgrade() -> None:
    op.drop_table("look_feedback")
    op.drop_table("look_drafts")
    with op.batch_alter_table("saved_looks") as batch_op:
        batch_op.drop_constraint("uq_look_client_token_per_user", type_="unique")
        batch_op.drop_column("client_token")
