"""add fee structure target group

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-05-22 15:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d9e0f1a2b3c4"
down_revision = "c8d9e0f1a2b3"
branch_labels = None
depends_on = None


fee_structure_target = sa.Enum("ALL", "NEW_INTAKE", "RETURNING", name="feestructuretarget")


def upgrade() -> None:
    bind = op.get_bind()
    fee_structure_target.create(bind, checkfirst=True)
    op.add_column(
        "fee_structures",
        sa.Column(
            "target_group",
            fee_structure_target,
            nullable=False,
            server_default="ALL",
        ),
    )
    op.execute("UPDATE fee_structures SET target_group = 'ALL' WHERE target_group IS NULL")
    op.alter_column("fee_structures", "target_group", server_default=None)


def downgrade() -> None:
    op.drop_column("fee_structures", "target_group")
    bind = op.get_bind()
    fee_structure_target.drop(bind, checkfirst=True)
