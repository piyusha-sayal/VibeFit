"""Privacy controls: deletable photographs and retention consent.

A photograph could be stored but never removed — there was no delete path at
all. Two changes make one possible: the analysis stops requiring its photo to
exist, and it records when that photo was removed, so "no photograph" and
"never had one" stay distinguishable.

Additive only. Nothing is dropped and no existing row changes meaning:
image_url becomes nullable, which no current row violates.

`analyses` is spelled out in full for `copy_from`. SQLite cannot relax NOT NULL
in place, so Alembic rebuilds the table, and it can only do that safely when it
is told the shape to rebuild — reflecting it instead leaves the column order
ambiguous and the rebuild fails. Postgres issues a plain ALTER and ignores it.

Revision ID: 0007_privacy_controls
Revises: 0006_create_my_look
"""
import sqlalchemy as sa
from alembic import op

revision = "0007_privacy_controls"
down_revision = "0006_create_my_look"
branch_labels = None
depends_on = None

# The shape of `analyses` as it stands at 0006, before this migration.
_analyses = sa.Table(
    "analyses",
    sa.MetaData(),
    sa.Column("id", sa.String(), primary_key=True),
    sa.Column("user_id", sa.String(),
              sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    sa.Column("image_url", sa.String(), nullable=False),
    sa.Column("status", sa.String(length=20)),
    sa.Column("face_analysis", sa.JSON()),
    sa.Column("color_analysis", sa.JSON()),
    sa.Column("hair_analysis", sa.JSON()),
    sa.Column("body_analysis", sa.JSON()),
    sa.Column("skin_analysis", sa.JSON()),
    sa.Column("quality", sa.JSON()),
    sa.Column("error_message", sa.Text()),
    sa.Column("created_at", sa.DateTime(timezone=True)),
    sa.Column("updated_at", sa.DateTime(timezone=True)),
)


# The same table after this migration, for the downgrade's own rebuild.
# Spelled out rather than copied: a copied Column carries its old constraints
# and belongs to the other MetaData, which is a quieter bug than a longer file.
_analyses_after = sa.Table(
    "analyses",
    sa.MetaData(),
    sa.Column("id", sa.String(), primary_key=True),
    sa.Column("user_id", sa.String(),
              sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    sa.Column("image_url", sa.String(), nullable=True),
    sa.Column("status", sa.String(length=20)),
    sa.Column("face_analysis", sa.JSON()),
    sa.Column("color_analysis", sa.JSON()),
    sa.Column("hair_analysis", sa.JSON()),
    sa.Column("body_analysis", sa.JSON()),
    sa.Column("skin_analysis", sa.JSON()),
    sa.Column("quality", sa.JSON()),
    sa.Column("error_message", sa.Text()),
    sa.Column("created_at", sa.DateTime(timezone=True)),
    sa.Column("updated_at", sa.DateTime(timezone=True)),
    sa.Column("photo_deleted_at", sa.DateTime(timezone=True), nullable=True),
)


def upgrade() -> None:
    with op.batch_alter_table("analyses", copy_from=_analyses) as batch_op:
        batch_op.alter_column("image_url", existing_type=sa.String(),
                              nullable=True)
        batch_op.add_column(sa.Column(
            "photo_deleted_at", sa.DateTime(timezone=True), nullable=True))
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.add_column(sa.Column(
            "photo_retention_consent", sa.Boolean(), nullable=False,
            server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.drop_column("photo_retention_consent")
    # Rows whose photograph was deleted have no URL to restore, so going back
    # is only safe before anyone has used the feature. Give those rows a
    # placeholder rather than failing the NOT NULL half-way through.
    op.execute("UPDATE analyses SET image_url = 'local://deleted' "
               "WHERE image_url IS NULL")
    with op.batch_alter_table("analyses", copy_from=_analyses_after) as batch_op:
        batch_op.drop_column("photo_deleted_at")
        batch_op.alter_column("image_url", existing_type=sa.String(),
                              nullable=False)
