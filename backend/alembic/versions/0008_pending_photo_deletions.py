"""Track photograph deletes that failed, so they cannot become orphans.

Account deletion removes the rows that name a person's photographs. If the
object store is unreachable at that moment the row still has to go — nobody
should be trapped in an account because a bucket is down — but the object
would then exist with nothing left anywhere that knows about it.

This table is that knowledge. It holds only the object key, which is a random
UUID under uploads/, and no user reference: it has to outlive the account it
came from. Rows are removed as soon as the delete succeeds.

Revision ID: 0008_pending_photo_deletions
Revises: 0007_privacy_controls
"""
import sqlalchemy as sa
from alembic import op

revision = "0008_pending_photo_deletions"
down_revision = "0007_privacy_controls"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pending_photo_deletions",
        sa.Column("object_key", sa.String(length=300), primary_key=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("last_tried_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_pending_photo_deletions_created_at",
                    "pending_photo_deletions", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_pending_photo_deletions_created_at",
                  table_name="pending_photo_deletions")
    op.drop_table("pending_photo_deletions")
