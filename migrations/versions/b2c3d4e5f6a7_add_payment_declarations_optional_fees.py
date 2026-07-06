"""add payment_declarations and optional_fees tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-04 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payment_declarations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("declared_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_method", sa.String(), nullable=True),
        sa.Column("reference", sa.String(), nullable=True),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("declared_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("declared_at", sa.DateTime(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("PENDING", "CONFIRMED", "REJECTED", name="paymentdeclarationstatus"),
            nullable=True,
        ),
        sa.Column("confirmed_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("confirmed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(), nullable=True),
        sa.Column("rejection_reason", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "optional_fees",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("billing_period", sa.String(), nullable=False, server_default="termly"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("optional_fees")
    op.drop_table("payment_declarations")
    # Drop the enum type (PostgreSQL specific)
    op.execute("DROP TYPE IF EXISTS paymentdeclarationstatus")
