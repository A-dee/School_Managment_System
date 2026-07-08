"""add school config subscription

Revision ID: 9f1a2b3c4d5e
Revises: 89c7fc7b3b5a
Create Date: 2026-07-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9f1a2b3c4d5e"
down_revision: Union[str, None] = "89c7fc7b3b5a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "school_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_name", sa.String(), nullable=False),
        sa.Column(
            "subscription_tier",
            sa.Enum("FREE", "PRO", "PREMIUM", "ENTERPRISE", name="subscriptiontier"),
            server_default="FREE",
            nullable=False,
        ),
        sa.Column("subscription_expires_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_school_configs_id"), "school_configs", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_school_configs_id"), table_name="school_configs")
    op.drop_table("school_configs")
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        sa.Enum(name="subscriptiontier").drop(bind, checkfirst=True)
